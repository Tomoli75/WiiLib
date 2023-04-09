const apply = (wiimote) => {
    wiimote._processData = (function() {
        //region REFLECTION_PROCESS
        var cached = wiimote._processData;
        return function() {
            cached.apply(this,arguments);
            const type = arguments[0];
            const data = arguments[1];
            const buffer = arguments[0];
            const c = check => check === "1";
            if(type === "extension") {
                if(wiimote.extensionType === "nunchuk") {
                    const nunchuk = {
                        button_c: !c(data[46]),
                        button_z: !c(data[47]),
                        //raw_x: parseInt(data.extension.slice(0,8), 2),
                        //raw_y: parseInt(data.extension.slice(8,16), 2),
                        pos_x: Math.round((parseInt(data.slice(0,8), 2) - 128) / 16) * 16 + 0,
                        pos_y: Math.round((parseInt(data.slice(8,16), 2) - 128) / 16) * 16 + 0
                        // straight from wiibrew
                    }
                    this.emit("data.nunchuk", nunchuk);
                }
            }
        }
        //endregion
    })();
}

module.exports = apply;
