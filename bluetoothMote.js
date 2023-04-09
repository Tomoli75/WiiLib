const HID = require('node-hid');
const Wiimote = require("./wiimote");

class bluetoothMote extends Wiimote {
    constructor(path) {
        super();
        this.device = new HID.HID(path);
        this.device.on("data", (data) => {
            this.processReadBytes(data);
        })
    }
    writeBytes() {
        this.device.write([...arguments]);
    }
}

module.exports = bluetoothMote;
