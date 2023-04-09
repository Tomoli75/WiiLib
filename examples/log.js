const bluetoothMote = require("../bluetoothMote.js");
const HID = require('node-hid');

var wiimote = new bluetoothMote(HID.devices().filter(x => x.serialNumber === "")[0].path); // actual wiimote
//var wiimote = new bluetoothMote(HID.devices().filter(x => x.serialNumber === "")[0].path); // bal board

wiimote.handshake().then(() => {
    console.log("[!] Handshake finished, ready to use remote");
    console.log("[!] Extension: "+wiimote.extensionType);
    if(wiimote.extensionType !== "none") {
        wiimote.setDataMode(0x32);
    }
});

wiimote.on("data.button", (data) => {
    //console.log(`[*] ${JSON.stringify(data)}`);
})

let lights = false;
setInterval(() => {
    lights = !lights;
    wiimote.send(0x11, lights ? 240 : 0);
}, 1000);
