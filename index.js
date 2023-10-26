/*
MIT License
Copyright (c) 2018, Kevin Gut (https://cable.ayra.ch/contact)
This is a modified version by A99US (https://github.com/A99US/totp-js)
*/

// =================================================================================
// ========================= Site specific JavaScript ==============================

"use strict";

window.addEventListener("load", function () {
    //Because typing costs time and time is money (and money is life)
    var q = document.querySelector.bind(document);
    var qa = document.querySelectorAll.bind(document);

    //Button to generate code
    var btnGetTokenSingle = q("#getTokenSingle"); // "[type=button]"
    var btnGetTokenArray = q("#getTokenArray");
    //TOTP Secret
    var formSecret = q("#token");
    //Number of TOTP digits
    var formDigits = q("#digits"); // [type=number]
    //Secret Code type
    var formMode = q("#enctype"); // select
    //Period / Interval
    var formPeriod = q("#interval");
    //OTPAuth textarea
    var formOtpauthSource = q("#otpauthSource")
    //Select option from OTPAuth textarea
    var secretopt = q("#secretopt")

    //Default value OTPAuth textarea
    formOtpauthSource.innerHTML =
    'otpauth://totp?secret=CCDDBBAA333666\n'+
    'otpauth://totp/Example.Com:XMPLUser?secret=ABBCCDD2345&issuer=Example.Com\n'+
    `otpauth://totp/GitServer:Dev123?secret=CCBBDDAA5432&issuer=GitServer&digit=7&period=5`

    //List of valid TOTP Secret code patterns
    var pattern = {
        //Base32 Code
        "1": {
            regex: "[A-Za-z2-7]+=*",
            title: "Secret should be Base32 encoded (using only a-z and 2-7)"
        },
        //Raw Hex Code
        "2": {
            regex: "([A-Fa-f0-9]{2})*",
            title: "Hexadecimal only (0-9 and a-f, even number of characters)"
        }
    };

    //Math.range
    var range = function (min, x, max) {
        return Math.max(Math.min(x | 0, max), min) | 0;
    };

    //Validate a form element
    var validate = function (x) {
        return !x.reportValidity || x.reportValidity();
    };

    //Updates the URL to the current values
    var setHash = function (code, mode, digits, period) {
        location.hash = "#" + JSON.stringify({
                c: code,
                m: mode,
                d: digits,
                p: period
            });
    };

    //Fills in values from the URL
    var getHash = function () {
        if (location.hash.length > 1) {
            try {
                var data = JSON.parse(decodeURIComponent(location.hash.substr(1)));
                formSecret.value = data.c;
                formPeriod.value = data.p;
                if (pattern[data.m]) {
                    formMode.value = data.m;
                }
                formDigits.value = range(6, data.d | 0, 8);
            } catch (e) {
                console.warn(e, "Invalid JSON in URL:", location.hash.substr(1));
                return false;
            }
            setPattern();
            return true;
        }
        setPattern();
        return false;
    };

    //Checks and processes the form
    var checkForm = function () {
        //IE11 and older has no reportValidity support
        if (validate(formSecret) && validate(formDigits) && validate(formMode)) {
            clearTimeout(timer.single);
            var digits = range(6, +formDigits.value, 8);
            let period = formPeriod.value;
            var secret = formSecret.value;
            if (formMode.value === "1") {
                try {
                    secret = Convert.base32toHex(secret);
                } catch (e) {
                    alert("Invalid Base32 characters");
                    return;
                }

                // Set URL hash
                setHash(formSecret.value, +formMode.value, digits, period);
                // Show tokens div
                q("#codes").style.display = "block";

                checkToken({
                    secret: secret,
                    digits: digits,
                    period: parseInt(period),
                    type: "single",
                    init: true,
                    target: {
                        time: ".time",
                        token: [
                            ["#totpPP",-2],  //2nd Prev
                            ["#totpP",-1],   //Prev
                            ["#totpC",0],    //Current
                            ["#totpN",1]     //Next
                        ],
                        countdown: [".counter","s"]
                    }
                });
            }
        }
    };

    //Timer vars
    var timer = { single: null, array: null };

    //Get the token
    var checkToken = async function (st) {
        try {
            if(st.debug) console.debug("Getting TOTP for", st.secret);
            // Set or Reset Token on function init or countdown reset
            if(st.init || st.countdown==st.period){
                let counter = TOTP.getCurrentCounter(st.period);
                st.countdown = TOTP.getCountdown(st.period)
                //console.log(counter)
                let targetID = 0
                q(st.target.time).textContent = (new Date()).toLocaleTimeString()
                while(st.target.token[targetID]){
                    q(st.target.token[targetID][0]).textContent =
                        await TOTP.otp(
                            st.secret, st.digits,
                            counter + (st.target.token[targetID][1]) //, false
                            //st.target.token[targetID][1], st.period
                            //, true
                        )
                    targetID += 1;
                }
                st.init = false;
            }

            //Countdown
            q(st.target.countdown[0]).textContent = st.countdown + (st.target.countdown[1] || "")

            st.countdown = st.countdown==1 ? st.period : st.countdown-1

            // Timer to refresh TOTP
            timer[st.type] = setTimeout(async () => {
                await checkToken(st);
            }, 1000);

        } catch (e) {
            q("#codes").style.display = "none";
            console.error(e);
            alert(
                "Problem decoding Secret.\n"+
                "Verify your secret and type are correct.\n"+
                "Message from decoder: " + e.message
            );
        };
    };

    var selectArray = [];

    //Fetch OTPAuth list in textarea
    var FetchSelectArray = async function(){
        clearTimeout(timer.array);
        selectArray = []
        secretopt.innerHTML = ""
        q("#arrayResult").innerHTML = ""
        let secretArray = formOtpauthSource.value.split("\n"),
            arrayID = 0, item,
            parser, param, pathname, type, name,
            username, issuer, algo, digits, period, secret
        while(secretArray[arrayID]){
            item = secretArray[arrayID]
            parser = new URL(item);
            param = str => parser.searchParams.get(str);
            pathname = parser.pathname.split("/");
            type = pathname[2] || null
            name = pathname[3] ? decodeURIComponent(pathname[3]) : null
            // console.log(name)
            if(parser.protocol=="otpauth:" && type=="totp" && param("secret")){
                username = name && name.split(":").length > 1 ?
                    name.split(":").slice(-1)[0] : null
                // Label issuer and param issuer should be the same
                // Param issuer is priority, label issuer for older version
                // Label and issuer might be URL-Encoded, Decode first
                issuer = param("issuer") ? decodeURIComponent(param("issuer")) :
                    name && username ?
                    name.substr(0, name.length - (username.length+1)) :
                    name ? name : null
                algo = param("algo") || param("algorithm") || "SHA1"
                digits = range(6, +(parseInt(param("digits") || param("digit"))), 8) || 6
                period = parseInt(param("period")) || parseInt(param("interval")) || 30
                // Assuming all secret codes are in Base32
                try {
                    secret = Convert.base32toHex(param("secret"));
                } catch (e) {
                    alert(
                        "Invalid Base32 characters\n"+
                        "code : "+ param("secret") +"\n"+
                        "Line : "+ (arrayID+1)
                    );
                    return;
                }
                selectArray.push({
                    issuer: issuer,
                    username: username,
                    secret: secret,
                    secretori: param("secret"),
                    digits: digits,
                    period: parseInt(period),
                    algo: algo,
                    type: "array",
                    init: true,
                    target: {
                        time: ".timeArray",
                        token: [
                            [".tokenArrayC",0],
                            [".tokenArrayP",-1],
                            [".tokenArrayPP",-2],
                            [".tokenArrayN",1]
                        ],
                        countdown: [".counterArray","s"]
                    }
                })
            }
            arrayID += 1
        }
        //console.log(selectArray)
        arrayID = 0
        // Add OTPAuth URL to select option
        while(selectArray[arrayID]){
            item = selectArray[arrayID]
            //console.log(item.secret)
            addselectoption(
                secretopt,
                arrayID,
                (!item.issuer || item.issuer=='') && (!item.username || item.username=='') ?
                "Secret Code : "+ item.secretori :
                (
                    (item.issuer && item.issuer!='' ? item.issuer : "No Issuer") +" - "+
                    (item.username && item.username!='' ? item.username : "No Username")
                )
            )
            arrayID += 1
        }
        // Select option already built, Get the token
        checkArray()
    };

    var checkArray = async function(){
        if(secretopt.options.length<1) return;
        clearTimeout(timer.array);
        let item = selectArray[secretopt.value]
        item.init = true
        let label = (str1,str2='') => "<label class='listLabel2'>"+ str1 +"</label>"+ str2;
        let tr = (str1,str2) => "<tr><td>"+ str1 +"&nbsp;</td><td>&nbsp;"+ str2 +"</td></tr>"
        let formclass = str => "<div class='form'>"+ str +"</div>"
        q("#arrayResult").innerHTML =
            formclass(label("Issuer"," : ") + (
                item.issuer && item.issuer!='' ? item.issuer : "<i>No Issuer</i>"
            ) ) +
            formclass(label("Username"," : ") + (
                item.username && item.username!='' ? item.username : "<i>No Username</i>"
            ) ) +
            formclass(label("Setting"," : ") +
                item.digits +" digits, "+
                item.period +"s period, "+
                item.algo +" algorithm"
            )+
            formclass(label("Generated at"," : ") + "<span class='timeArray'></span>"+
            ", refresh in <span class='counterArray'></span>") +"<BR>"+
            "<table class='table'>"+
                tr("<code class='tokenArrayN totp'></code>","Next Token")+
                tr("<code class='tokenArrayC totp'></code>","<b>Current Token</b>")+
                tr("<code class='tokenArrayP totp'></code>","Previous Token")+
                tr("<code class='tokenArrayPP totp'></code>","2nd Previous Token")+
            "</table>"
        await checkToken(item);
    };

    var addselectoption = function(select, value, text=""){
        let option = document.createElement("option")
        option.value = value
        option.text = text
        // let select = document.getElementById("selectid")
        select.appendChild(option)
        /*
        TO REMOVE SINGLE
        select.options.remove(0), or select.remove(0)
        TO REMOVE ALL
        select.innerHTML = ""
        */
    };

    if (TOTP.isCompatible()) {
        //Generate and display secret code
        btnGetTokenSingle.addEventListener("click", checkForm);
        btnGetTokenArray.addEventListener("click", FetchSelectArray);
        secretopt.addEventListener("change", checkArray);
    } else {
        //Incompatible browser
        alert("Your browser is outdated and lacks missing components for this implementation. Please update your browser");
        q(".container").innerHTML = "<h1 class=\"alert alert-danger\">" +
            "Outdated browser, try to live in the year" + (new Date()).getFullYear() +
            "</h1>";
    }
    //Set the pattern for the secret code textbox
    var setPattern = function () {
        if (pattern[formMode.value]) {
            formSecret.setAttribute("pattern", pattern[formMode.value].regex);
            formSecret.setAttribute("title", pattern[formMode.value].title);
        } else {
            alert("attempted to select invalid Pattern. The website will reset now");
            location.reload(true);
        }
    };
    //Hook up setPattern event
    formMode.addEventListener("change", setPattern);

    //Show warning if not running on file system
    var isOnline = (location.protocol.indexOf("file:") !== 0);
    var eleOnline = qa(".online-only");
    var eleOffline = qa(".offline-only");
    for (var i = 0; i < eleOffline.length; i++) {
        eleOffline[i].style.display = isOnline ? "none" : "block";
    }
    for (var i = 0; i < eleOnline.length; i++) {
        eleOnline[i].style.display = isOnline ? "block" : "none";
    }

    //Set initial data and pattern
    if (getHash()) {
        checkForm();
    }

    //Array.prototype.slice.call(qa("input,select"), 0)
    Array.prototype.slice.call(qa("#token,#digits,#enctype,#interval"), 0)
    .forEach(function (v) {
        v.addEventListener("keydown", function (e) {
            if (e.keyCode === 13 || e.which === 13) {
                e.preventDefault();
                e.stopPropagation();
                checkForm();
            }
        });
    });

    //Link that opens the help box at the bottom and hides itself
    q("#singleHelpButton").addEventListener("click", function (e) {
        if(q("#singleHelpDiv").style.display=="block"){
            q("#singleHelpDiv").style.display = "none"
            q("#singleHelpButton").text = "Show Help"
        }else{
            q("#singleHelpDiv").style.display = "block"
            q("#singleHelpButton").text = "Hide Help"
        }
    });
    q("#arrayHelpButton").addEventListener("click", function (e) {
        if(q("#arrayHelpDiv").style.display=="block"){
            q("#arrayHelpDiv").style.display = "none"
            q("#arrayHelpButton").text = "Show Help"
        }else{
            q("#arrayHelpDiv").style.display = "block"
            q("#arrayHelpButton").text = "Hide Help"
        }
    });
    q("#hideWarningButton").addEventListener("click", function (e) {
        q("#warningDiv").style.display = "none"
    });

    //Load otpauth file
    q("#txtload").addEventListener("click", function(e){
      q("#file").click();
    });
    q("#file").addEventListener("change", async function(e){
      formOtpauthSource.value = ((await dataload(this)).join("\n\n")); // .change()
      q("#file").value = "";
    });
    //Save otpauth text
    q("#txtsave").addEventListener("click", function(e){
      download_blob(formOtpauthSource.value, "OTPAuth.txt");
    });


     /**
      * Download url
      * @param {string} url - Url to save
      * @param {string} filename - Default filename and extension when saving
      * @example
      * download_url("https://www.example.com") // Will be saved as "download.txt"
      * download_url("https://www.example.com","data-2023.txt")
      */

     function download_url(url = "", filename = "download.txt"){
       let element = document.createElement('a');
       element.href = url;
       element.download = filename;
       element.style.display = 'none';
       document.body.appendChild(element);
       element.click();
       document.body.removeChild(element);
     }

     /**
      * Save blob / data string to file
      * @param {object|string} blob - Blob / string to save
      * @param {string} filename - Default filename and extension when saving
      * @example
      * let dataBlob = new Blob([data], { type: 'text/plain' });
      * download_blob(dataBlob) // Will be saved as "download.txt"
      * download_blob(dataBlob,"data-2023.txt")
      * download_blob("String to be saved","data-2023.txt")
      */

     function download_blob(blob, filename = "download.txt"){
       if(typeof blob === 'string')
         blob = new Blob( [blob], { type: 'text/plain' } );
       blob = window.URL.createObjectURL(blob);
       let element = document.createElement('a');
       element.href = blob;
       element.download = filename;
       element.style.display = 'none';
       document.body.appendChild(element);
       element.click();
       document.body.removeChild(element);
       window.URL.revokeObjectURL(blob);
       window.URL.revokeObjectURL(element.href);
     }
     
     // Backward Compatibility
     function datasave(data = "", filename = "download.txt"){
       //download_url('data:text/plain;charset=utf-8,'+ encodeURIComponent(data), filename);
       download_blob(data, filename);
     }
     
     /**
      * Load data from file
      *
      * From : {@link https://thecompetentdev.com/weeklyjstips/tips/65_promisify_filereader/}
      * @param {object} fileOpt - Input files
      * @return {object}
      * @example
      * // Single file
      * let data = (await dataload(this))[0]
      * // Multiple files
      * let data = (await dataload(this)).join("\n")
      */

     async function dataload(fileOpt){
       const read = (file) => new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = (event) => resolve(event.target.result);
         reader.onerror = reject;
         reader.readAsText(file);
       });
       let fileArray = fileOpt.files,
           file, data = [], arrlen;
       arrlen = Object.keys(fileArray).length;
       for(let i=0; i<arrlen; i++){
         file = fileArray[i];
         data.push(await read(file));
       }
       return data;
     }
});
