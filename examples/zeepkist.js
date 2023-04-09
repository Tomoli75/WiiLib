const bluetoothMote = require("../bluetoothMote.js");
const HID = require('node-hid');
const {keyboard, Key, screen, Region, Point} = require("@nut-tree/nut-js");
const robot = require("robotjs");
const { createWorker } = require("tesseract.js");
const Jimp = require("jimp");

keyboard.config.autoDelayMs = 0;
robot.setKeyboardDelay(0);

let ocrReady = false;
let worker = createWorker({
    logger: arg => {}
});

worker.load().then(() => worker.loadLanguage("eng").then(() => worker.initialize("eng").then(() => ocrReady = true)));

var wiimote = new bluetoothMote(HID.devices().filter(x => x.serialNumber === "")[0].path); // actual wiimote
//var wiimote = new bluetoothMote(HID.devices().filter(x => x.serialNumber === "")[0].path); // bal board

const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    right_shift: false,
    enter: false
}
const cachedKeys = Object.assign({}, keys);

wiimote.handshake().then(() => {
    console.log("[!] Handshake finished, ready to use remote");
    console.log("[!] Extension: "+wiimote.extensionType);
    wiimote.send(0x11, 16);
    wiimote.setDataMode(0x32);
});

wiimote.on("data.button", (data) => {
    keys.down = !!data["button_b"];
    keys.up = !!data["button_a"];
    keys.right_shift = !!data["button_home"];
    keys.enter = !!data["button_plus"];
});

wiimote.on("shutdown", (time) => {
    Object.keys(keys).forEach(key => keys[key] = false);
    keyboard.releaseKey(Key.Up);
    keyboard.releaseKey(Key.Down);
    keyboard.releaseKey(Key.Left);
    keyboard.releaseKey(Key.Right);
    wiimote.send(0x11, 0);
})

wiimote.on("data.nunchuk", (data) => {
    keys.right = data["pos_x"] > 48;
    keys.left = data["pos_x"] < -48;
});

const keyNameType = {
    up: Key.Up,
    down: Key.Down,
    left: Key.Left,
    right: Key.Right,
    right_shift: Key.RightShift,
    enter: Key.Enter
}

setInterval(() => {
    Object.keys(keys).forEach(key => {
        if(cachedKeys[key] !== keys[key]) {
            cachedKeys[key] = keys[key];
            //console.log(keyNameType[key]);
            if(keys[key]) {
                //keyboard.pressKey(keyNameType[key]);
                robot.keyToggle(key, "down");
            } else {
                //keyboard.releaseKey(keyNameType[key]);
                robot.keyToggle(key, "up");
            }
        }
    })
}, 1);

// colour: 1815,990
// region: new Region(1650,925, 200,85)

const imageToJimp = (image) => {
    const jimpImage = new Jimp({
        data: image.data,
        width: image.width,
        height: image.height
    });
    // Images treat data in BGR format, so we have to switch red and blue color channels
    jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, function (_, __, idx) {
        const red = this.bitmap.data[idx];
        this.bitmap.data[idx] = this.bitmap.data[idx + 2];
        this.bitmap.data[idx + 2] = red;
    });
    return jimpImage;
}

const isNumber = (num) => {
    try {
        const number = parseInt(num);
        return !isNaN(number);
    } catch(e) {
        return false;
    }
}

setInterval(() => {
    screen.colorAt(new Point(1815,990)).then(colour => {
        colour = colour.toHex();
        if(colour === "#ffeb04ff") { // too slow
            wiimote.send(0x11, 1);
        } else {
            wiimote.send(0x11, 0);
        }
        if(colour === "#ffffffff") { // good speed
            //wiimote.send(0x11, 0);
        }
    })
}, 1000);

setInterval(() => {
    return; // disabled
    if(!ocrReady) return;
    const grabbing = new Region(1650,925, 200,85);
    screen.highlight(grabbing);
    screen.grabRegion(grabbing).then(imageRaw => {
        const image = imageToJimp(imageRaw);
        image.getBufferAsync('image/png').then(buffer => {
            worker.recognize(buffer).then(data => {
                const split = data.data.text.split("\n");
                if(isNumber(split[0])) {
                    console.log(split[0]);
                }
            })
        })
    })
}, 1000);
