
# Pure JavaScript TOTP Token Generator

This javascript library allows you to generate a TOTP Token from a TOTP secret code. It purely run in javascript and doesn't have any dependency. This library was originally written by [Kevin Gut](https://cable.ayra.ch/totp/). I just modified it a little bit and add an OTPAuth token fetcher

### Section
 - **[Demo](#demo)**
 - **[How To Use](#how-to-use)**
 - **[Changes / Breaking Changes](#changes--breaking-changes)**
 - **[To-Do List](#to-do-list)**
 - **[Credits](#credits)**

## Demo

**[Demo On GitHub Page](https://a99us.github.io/totp-js/)**

You can try the demo using a TOTP secret code or an OTPAuth url.

## How To Use

Add the library to your page :

```html
<!-- Use Normal Version -->
<script type="text/javascript" src="https://a99us.github.io/totp-js/totp.js"></script>
<!-- Or Minified Version -->
<script type="text/javascript" src="https://a99us.github.io/totp-js/totp.min.js"></script>
```

Here are the available functions in the library :

#### - Convert.base32toHex()

Since most (if not all) of TOTP secret code are in base32, you will need to convert them into hex string. **`TOTP.otp`** function only takes secret code in hex.

```javascript
let secret = "AABBCC56", secrethex
secrethex = Convert.base32toHex(secret)
```

#### - TOTP.getCurrentCounter()

Calculate TOTP counter for the current  time. Only have 1 argument, **period**. If left empty, it will choose default value of 30

```javascript
let counter, period = 15
counter = TOTP.getCurrentCounter(period) // period : 15
counter = TOTP.getCurrentCounter()       // period : 30 (default value)
```

#### - TOTP.otp()

```javascript
let token = await TOTP.otp(secret, digits, counter, period, debug)
```

This is the function to generate TOTP token. It takes 5 arguments :

- **secret (string, mandatory)** : Secret key as hex string. If it's in base32, it need to be converted
- **digits (number, optional)** : The expected result length of the token (digit). Usually 6. Default value is 6
- **counter (number, optional)** : Counter for the OTP function. If undefined or false, will automatically default to the counter value of current time
- **period (number, optional)** : Default value is false. If not false / defined, will automatically add **`TOTP.getCurrentCounter()`** to counter (read more detail in example below)
- **debug (boolean, optional)** : If true, function will show **`console.debug`** from function's process

```javascript
let secret = "AABBCC456",
    digits = 8,
    period = 15,
    counter, token

// ======================================
// =========== USAGE EXAMPLES ===========

// If secret is in base32, you'll need to convert it to hex first
secret = Convert.base32toHex(secret)

// User only gives 1 argument : secret
// Digit will default to 6
// Counter will default to current time of 30s period
token = await TOTP.otp(secret)

// User gives 2 arguments : secret and digits
// Counter will default to current time of 30s period
token = await TOTP.otp(secret, digits)

// User gives 3 arguments : secret, digits and counter
// Calculates counter individually
counter = TOTP.getCurrentCounter(period)
token = await TOTP.otp(secret, digits, counter)

// You can add or subtract the value of counter
// to get the next or previous token
let nextToken = await TOTP.otp(secret, digits, counter+1)
let previousToken = await TOTP.otp(secret, digits, counter-1)

/*
User gives 4 arguments : secret, digits, counter and period.
Calculates counter automatically in the function according to
the period given. In place of counter arg in function, you should
put the amount of addition or subtraction of the counter.
If you put 0 in place of counter, you'll get the value of
counter in the current period of time. 1 for the next counter.
-1 for the previous counter, and so on
*/
// Get the token of current time period
token = await TOTP.otp(secret, digits, 0, period)
// Get the token of next time period
nextToken = await TOTP.otp(secret, digits, 1, period)
// Get the token of previous time period
previousToken = await TOTP.otp(secret, digits, -1, period)

```

#### - TOTP.getCountdown()

Calculate the countdown until a new token, in second. Only have 1 argument, **period**. If left empty, it will choose default value of 30

```javascript
let countdown, period = 15
countdown = TOTP.getCountdown(period) // period : 15
countdown = TOTP.getCountdown()       // period : 30 (default value)
```


## Changes / Breaking Changes

Changes / breaking changes from the original codes :
- Renaming some variables to eliminate confusion : interval-period, length-size-digits, current-counter, etc
- Add default value : interval, etc
- Option to automate ***counterInt*** value in **`TOTP.otp`** args
- Rearranging **`TOTP.otp`** args placement, to accomodate automation of ***counterInt*** value and for better readibility
- **`TOTP.otp`** and **`TOTP.hmac`** functions have been converted into asynchronous functions so it can return a value directly instead
- Remove callback args completely from **`TOTP.otp`** and **`TOTP.hmac`**
- Add **`TOTP.getCountdown()`** function. Countdown from now until the new time period, in second

## To-Do List

- Function to process OTPAuth url and return array object of token, issuer, username, countdown, etc

## Credit And License

Credit and License belong to the original author, [Kevin Gut](https://cable.ayra.ch/contact)
