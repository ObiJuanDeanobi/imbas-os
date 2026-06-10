import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1200, height: 800 });
  await win.loadURL('http://localhost:5173'); // Assuming dev server is running? Or we can just load the file
  
  // Wait, the app is normally started via `npm start`. If we just modify src/main/app.ts to capture a screenshot after 2 seconds?
  setTimeout(async () => {
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(app.getAppPath(), 'docs/assets/demo/artifact-vault-alpha-screenshot.png'), image.toPNG());
    console.log('Screenshot saved!');
    app.quit();
  }, 3000);
});
