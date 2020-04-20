const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const {siteLink, recaptchaKey, proxy} = require('./keys');
const accountDetails = require('./keys').account;

const run = () => new Promise(async (resolve, reject) => {
  try {
    // Configure Puppeteer to use stealth plugin and recaptcha plugin
    configurePuppeteer();

    console.log('Bot Started...');
    await createAccount(accountDetails)
    console.log('Bot Finished...');
    resolve(true);
  } catch (error) {
    console.log(`Bot Run Error: ${error}`);
    reject(error);
  }
})

const createAccount = (account) => new Promise(async (resolve, reject) => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        `--proxy-server=${proxy.ip}:${proxy.port}`
      ]
    });

    // Launch Page and Goto siteLink
    console.log('Loading site...');
    const page = await browser.newPage();
    await page.authenticate({username: proxy.user, password: proxy.password});
    await page.goto(siteLink, {timeout: 0, waitUntil: 'networkidle2'});

    // Wait for input fields
    console.log('Filling fields...');
    await page.waitForSelector('input#firstname');

    // Fill the Fields
    await page.type('input#firstname', account.firstName);
    await page.type('input#lastname', account.lastName);
    await page.type('input#formEmail', account.email);
    await page.evaluate(val => document.querySelector('input#profileBirthDate').value=val, account.dob);
    await page.type('input#formPassword', account.password);
    await page.type('input#formConfirmPassword', account.password);
    await page.evaluate(() => {
      document.querySelector("input#profileAgreeTC").checked = true;
    });

    // Solve the recaptcha
    console.log('Solving reCaptcha...');
    await page.solveRecaptchas();

    // Click Create Account Button
    console.log('Submitting Form...');
    await page.evaluate(() => {
      document.querySelector('a#createCrmAccountButton').click()
    });
    await page.waitFor(3000);
    await page.evaluate(() => {
      document.querySelector('a#createCrmAccountButton').click()
    });
    await page.waitFor(10000);

    // Check if form Submitted
    const gotSkip = await page.$('a#buttonSkipeAddress');
    if (gotSkip) {
      await browser.close();
      console.log('Account Created...');
      resolve(true);
    } else {
      await browser.close();
      console.log('Failed...');
      resolve(false);
    }
  } catch (error) {
    if (browser) await browser.close();
    console.log(`createAccount[${account.email}] Error: `, error);
    resolve(false);
  }
});

function configurePuppeteer () {
  puppeteer.use(StealthPlugin());
  puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: '2captcha',
        token: recaptchaKey
      },
      visualFeedback: true
    })
  );
}

run();