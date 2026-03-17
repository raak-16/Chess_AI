import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER LOG] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Check if we log in or need to navigate to game page
    await page.waitForSelector('a[href="/game"]');
    await page.click('a[href="/game"]');
    
    // Wait for the chessboard to load
    await page.waitForSelector('[data-boardid]', { timeout: 10000 });
    console.log('Board found. Waiting 1 second for pieces to animate/settle.');
    await new Promise(r => setTimeout(r, 1000));

    // Try clicking the square at e2. e2 is at column 5, row 2 in standard chess, but in DOM it has data-square="e2"
    const e2Square = await page.$('[data-square="e2"]');
    if (e2Square) {
       console.log("Clicking e2 square...");
       await e2Square.click();
    } else {
       console.log("Could not find square with data-square='e2', calculating bounding box of board instead.");
       const board = await page.$('[data-boardid]');
       const bbox = await board.boundingBox();
       if (bbox) {
         // Board is 8x8. e2 is column 5 from left (index 4), row 2 from bottom (index 6 from top)
         const squareWidth = bbox.width / 8;
         const squareHeight = bbox.height / 8;
         const x = bbox.x + squareWidth * 4 + squareWidth / 2;
         const y = bbox.y + squareHeight * 6 + squareHeight / 2;
         await page.mouse.click(x, y);
       }
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Clicking e4...");
    const e4Square = await page.$('[data-square="e4"]');
    if (e4Square) {
       await e4Square.click();
    } else {
       const board = await page.$('[data-boardid]');
       const bbox = await board.boundingBox();
       if (bbox) {
         const squareWidth = bbox.width / 8;
         const squareHeight = bbox.height / 8;
         const x = bbox.x + squareWidth * 4 + squareWidth / 2;
         const y = bbox.y + squareHeight * 4 + squareHeight / 2;
         await page.mouse.click(x, y);
       }
    }

    await new Promise(r => setTimeout(r, 1000));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
