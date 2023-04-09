const EventEmitter = require('events').EventEmitter;

const nunchuk = require("./impl/nunchuk");
const balance = require("./impl/balance");
const button = require("./impl/buttons");

function padEnd(array, minLength, fillValue = undefined) {
    return Object.assign(new Array(minLength).fill(fillValue), array);
}

function padStart(array, minLength, fillValue = undefined) {
    return Object.assign(new Array(minLength).fill(fillValue), array.reverse()).reverse();
}

const dataReportingModes = {
    0x30: {buttons:[1,3]},
    0x31: {buttons:[1,3],acceleration:[3,6]},
    0x32: {buttons:[1,3],extension:[3,11]},
    0x33: {buttons:[1,3],acceleration:[3,6],infrared:[6,18]},
    0x34: {buttons:[1,3],extension:[3,22]},
    0x35: {buttons:[1,3],acceleration:[3,6],extension:[6,22]},
    0x36: {buttons:[1,3],infrared:[3,13],extension:[13,22]},
    0x37: {buttons:[1,3],acceleration:[3,6],infrared:[6,16],extension:[16,22]},
    0x3d: {extension:[1,22]},
    0x3e: {buttons:[1,2], acceleration:[3,3], infrared:[4,21]}, // TODO: make this work, this isn't done properly
    0x3f: {buttons:[1,2], acceleration:[3,3], infrared:[4,21]}, // TODO: see above
}
const extensions = {
    none: "00000000000000000000000000000000",
    nunchuk: "0000a420000000000000000000000000",
    balance: "0000a420040200000000000000000000",
}

// this does not change with different wii remotes
// nintendo hasn't updated this in a good while
// TODO: replace raw bytes with names

class Wiimote extends EventEmitter {
    extensionType = "no_handshake";
    _balance = new Array(4).fill(null).map(function() { return new Array(3); });

    // requires implementation from extensions
    writeBytes() {
        throw new Error("No implementation for this - do not use raw class!");
    };

    send() { // expects bytes in the form of 1 byte = 1 argument
        this.writeBytes(...arguments); // 0xa2 is a magic byte from wiibrew, but it crashes the writing?
    };

    processReadBytes(bytes) {
        this.emit("raw_data", bytes);
        if(Object.keys(dataReportingModes).includes(bytes[0].toString())) {
            this._processDataReport(bytes);
        }
    };

    _processDataReport(bytes) {
        const mapping = dataReportingModes[bytes[0]];
        let bytesSplit = {};
        let bufferSplit = {};
        Object.keys(mapping).forEach(key => {
            const mapped = mapping[key];
            const section = bytes.slice(mapped[0], mapped[1]);
            bytesSplit[key] = BigInt('0x' + section.toString('hex')).toString(2).padStart(section.length * 8, '0')
            bufferSplit[key] = bytes.slice(mapped[0],mapped[1]+2);
        });
        this.emit("data", bytesSplit);
        Object.entries(bytesSplit).forEach(entry => {
            this._processData(entry[0], entry[1], bufferSplit[entry[0]]);
        })
    }

    _processData(type, data, buffer) {
        if(type === "buttons") {
            if(data[14] === "1" && data[15] === "1") { // safety check - 1 + 2 combo
                console.error("Stop button (1 & 2) has been pressed, gracefully shutting down");
                this.setDataMode(0x30);
                const gracefulTime = 1000;
                this.emit("shutdown", gracefulTime);
                setTimeout(() => {
                    process.exit(0);
                }, gracefulTime)
            }
        }
        // this is further implemented by the impl handlers
    }

    setDataMode(mode,continuous = false) {
        // TODO: give these names, for god sake
        if(!Object.keys(dataReportingModes).includes(mode.toString())) {
            throw new Error("Unknown data reporting method - Valid: " + Object.keys(dataReportingModes).join(","))
        }
        this.send(0x12, continuous ? 0x04 : 0x00, mode);
    }

    write(offset, bytes, eeprom = false) {
        if(eeprom) {
            console.warn("Writing to the ROM of the Wiimote is dangerous - are you sure this is intentional?");
        }
        this.writeBytes(0x16, (eeprom ? 0x00 : 0x04), ...offset, bytes.length, ...padEnd(bytes, 16, 0x00));
    }

    read(offset, size, eeprom = false) {
        return new Promise((resolve => {
            this.writeBytes(0x17, (eeprom ? 0x00 : 0x04), ...offset, ...padStart(size, 2, 0x00));
            const thisHandler = (bytes) => {
                let rawBytes = Buffer.alloc(bytes.length);
                bytes.copy(rawBytes);
                if(bytes[4] !== offset[1]) return;
                if(bytes[5] !== offset[2]) return;
                this.removeListener("raw_data", thisHandler);
                const usefulBytes = bytes.slice(6, bytes.length);
                resolve({
                    bytes: usefulBytes.toString("hex"),
                    raw: rawBytes
                });
            }
            this.on("raw_data", thisHandler);
        }))
    }

    handshake() {
        return new Promise(resolve => {
            this.setDataMode(0x30);
            this.write([0xA4, 0x00, 0xF0], [0x55]);
            this.write([0xA4, 0x00, 0xFB], [0x00]);
            this.read([0xA4, 0x00, 0xFA], [0x06]).then(data => {
                this.extensionType = Object.keys(extensions).find(key => extensions[key] === data.bytes);
                if(this.extensionType === "nunchuk") {
                    nunchuk(this);
                }
                if(this.extensionType === "balance") {
                    balance(this);
                }
                button(this);
                resolve();
            });
        })
    }
}

module.exports = Wiimote;
