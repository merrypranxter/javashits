import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const names=['Iridescent membranes','Chemical garden','Photon caustics','Ferrofluid cathedral','Quasicrystal','Chromatic loom','Mycelium circuit','Crystal accretion','Elastic topology','Strange attractor','Excitable matter','Diffraction atlas'];
async function openLibrary(page:Page){
  const toggle=page.getByRole('button',{name:/^Experiments/});
  if(await toggle.isVisible())await toggle.click();
}
async function openControls(page:Page){
  const toggle=page.getByRole('button',{name:'Mechanism',exact:true});
  if(await toggle.isVisible()&&!await page.getByRole('button',{name:'Close controls'}).isVisible())await toggle.click();
}
async function closeControls(page:Page){const button=page.getByRole('button',{name:'Close controls'});if(await button.isVisible())await button.click();}
async function image(page:Page){return page.locator('canvas').evaluate(c=>(c as HTMLCanvasElement).toDataURL());}

test('all twelve systems render, mutate, and retain distinct pixels',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  for(const name of names){
    await openLibrary(page);
    await page.getByRole('button',{name:new RegExp(name)}).first().click();
    await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
    await openControls(page);await expect(page.getByRole('button',{name:'Export PNG',exact:true})).toBeEnabled();
    await expect(page.locator('.render-error')).toHaveCount(0);await closeControls(page);
    const before=await image(page);
    const colors=await page.locator('canvas').evaluate(async c=>{
      const b=await createImageBitmap(c as HTMLCanvasElement),sample=document.createElement('canvas');sample.width=32;sample.height=32;const ctx=sample.getContext('2d')!;ctx.drawImage(b,0,0,32,32);b.close();
      const data=ctx.getImageData(0,0,32,32).data,set=new Set();for(let i=0;i<data.length;i+=4)set.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`);return set.size;
    });
    expect(colors,`${name} should contain actual artwork`).toBeGreaterThan(8);
    await openControls(page);const seed=await page.locator('.seed-row').innerText();
    await page.locator('.inspector').getByRole('button',{name:'Mutate specimen',exact:false}).click();
    await expect(page.locator('.seed-row')).not.toHaveText(seed);
    await closeControls(page);await page.waitForTimeout(250);
    await expect.poll(()=>image(page),{message:`${name} mutation must change the artwork`}).not.toBe(before);
  }
  expect(errors).toEqual([]);
});

test('mechanism controls, palette, reset, storage, and shared recipe operate',async({page})=>{
  await page.goto('/');await openControls(page);await expect(page.getByRole('button',{name:'Export PNG',exact:true})).toBeEnabled();await closeControls(page);
  const original=await image(page);await openControls(page);
  const slider=page.getByRole('slider',{name:'Film thickness',exact:true});await slider.focus();await slider.press('End');await closeControls(page);
  await expect.poll(()=>image(page)).not.toBe(original);
  await openControls(page);await expect(slider).toHaveValue('1.8');
  await page.getByRole('combobox',{name:'Color palette'}).selectOption('2');await closeControls(page);const changed=await image(page);expect(changed).not.toBe(original);
  await page.waitForTimeout(350);await page.reload();await openControls(page);
  await expect(page.getByRole('slider',{name:'Film thickness',exact:true})).toHaveValue('1.8');await expect(page.getByRole('combobox',{name:'Color palette'})).toHaveValue('2');
  await page.getByRole('button',{name:'Reset parameters',exact:true}).click();await expect(page.getByRole('slider',{name:'Film thickness',exact:true})).toHaveValue('0.62');
  await closeControls(page);
  const recipe={seed:12345,palette:1,params:{thickness:.75,tension:.2,density:4,refraction:.8}};
  const hash=new URLSearchParams({lab:'membrane',s:Buffer.from(JSON.stringify(recipe)).toString('base64')});
  await page.goto('/#'+hash.toString());await page.reload();await openControls(page);
  await expect(page.getByRole('slider',{name:'Film thickness',exact:true})).toHaveValue('0.75');await expect(page.locator('.seed-row')).toContainText('00012345');
});

test('aspect ratio, panel-free viewing, pause, and touch interaction work',async({page})=>{
  await page.goto('/');await openControls(page);await expect(page.getByRole('button',{name:'Export PNG',exact:true})).toBeEnabled();
  await page.getByRole('combobox',{name:'Aspect ratio',exact:true}).selectOption('4:5');await closeControls(page);
  await expect.poll(async()=>{const r=await page.locator('canvas').boundingBox();return Math.abs(r!.width/r!.height-.8);}).toBeLessThan(.015);
  expect(await page.evaluate(()=>document.body.scrollWidth<=innerWidth)).toBe(true);
  const before=await image(page),canvas=page.locator('canvas'),box=(await canvas.boundingBox())!;
  if(page.viewportSize()!.width<500)await page.touchscreen.tap(box.x+box.width*.62,box.y+box.height*.4);
  else await page.mouse.click(box.x+box.width*.62,box.y+box.height*.4);
  await expect.poll(()=>image(page)).not.toBe(before);
  await page.getByRole('button',{name:'Play animation',exact:true}).click();await page.waitForTimeout(250);await page.getByRole('button',{name:'Pause animation',exact:true}).click();
  await page.waitForTimeout(150);const paused=await image(page);await page.waitForTimeout(300);expect(await image(page)).toBe(paused);
  await page.getByRole('button',{name:'Hide panels',exact:true}).click();await expect(page.locator('.lab')).toHaveClass(/zen/);await expect(page.locator('.inspector')).not.toBeVisible();
  await page.getByRole('button',{name:/^Show panels/}).first().click();await expect(page.locator('.lab')).not.toHaveClass(/zen/);
});

test('exports a real 3840px PNG',async({page},testInfo)=>{
  await page.goto('/');await openControls(page);await expect(page.getByRole('button',{name:'Export PNG',exact:true})).toBeEnabled();
  await page.getByRole('combobox',{name:'Aspect ratio',exact:true}).selectOption('1:1');
  const pngEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();
  const png=await pngEvent;expect(await png.failure()).toBeNull();const pngPath=testInfo.outputPath('capture.png');await png.saveAs(pngPath);
  const bytes=await readFile(pngPath);expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.readUInt32BE(16)).toBe(3840);expect(bytes.readUInt32BE(20)).toBe(3840);
});

test('records a decodable browser-native video when an encoder is available',async({page},testInfo)=>{
  await page.goto('/');await openControls(page);await expect(page.getByRole('button',{name:'Export PNG',exact:true})).toBeEnabled();
  await page.getByRole('combobox',{name:'Aspect ratio',exact:true}).selectOption('1:1');
  await closeControls(page);await page.getByRole('combobox',{name:'Loop or recording duration'}).selectOption('6');await openControls(page);
  const button=page.getByRole('button',{name:/^Record 6s/});
  test.skip(!await button.count(),'Browser has no MediaRecorder canvas encoder');
  const videoEvent=page.waitForEvent('download',{timeout:45000});await button.click();const video=await videoEvent;
  expect(await video.failure()).toBeNull();const videoPath=testInfo.outputPath(video.suggestedFilename());await video.saveAs(videoPath);
  const videoBytes=await readFile(videoPath);expect(videoBytes.length).toBeGreaterThan(5000);
  const metadata=await page.evaluate(async({base64,mime})=>{
    const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:mime}),url=URL.createObjectURL(blob),video=document.createElement('video');video.muted=true;video.src=url;
    return await new Promise<{w:number;h:number}>((resolve,reject)=>{video.onloadedmetadata=()=>{const data={w:video.videoWidth,h:video.videoHeight};URL.revokeObjectURL(url);resolve(data);};video.onerror=()=>reject(new Error('Recorded video could not be decoded'));});
  },{base64:videoBytes.toString('base64'),mime:video.suggestedFilename().endsWith('.mp4')?'video/mp4':'video/webm'});
  expect(metadata.w).toBeGreaterThan(100);expect(metadata.h).toBeGreaterThan(100);
});

test('all seven analytic systems close their phase cycle',async({page})=>{
  await page.goto('/');
  const differences=await page.evaluate(async()=>{
    // Dynamic imports use Vite's actual renderer code rather than a separate test implementation.
    const modulePath='/src/art/renderer.ts',catalogPath='/src/art/catalog.ts';
    const {createRenderer}=await import(/* @vite-ignore */ modulePath),{experiments,defaults}=await import(/* @vite-ignore */ catalogPath);
    const diffs=[];
    for(const exp of experiments.filter((e:{periodic:boolean})=>e.periodic)){
      const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const params=defaults(exp),r=createRenderer(canvas,exp,74281,params),pointer={x:0,y:0,down:false,active:false};
      const sample=async()=>{const b=await createImageBitmap(canvas),c=document.createElement('canvas');c.width=96;c.height=96;const ctx=c.getContext('2d')!;ctx.drawImage(b,0,0);b.close();return ctx.getImageData(0,0,96,96).data;};
      r.resize(96,96);r.render(0,0,params,0,pointer);const a=await sample();r.render(Math.PI*2,0,params,0,pointer);const b=await sample();let error=0;for(let i=0;i<a.length;i++)error+=Math.abs(a[i]-b[i]);
      diffs.push({name:exp.name,error:error/a.length});r.destroy();
    }
    return diffs;
  });
  for(const d of differences)expect(d.error,`${d.name} phase seam`).toBeLessThan(2);
});
