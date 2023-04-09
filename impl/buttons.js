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
            if(type === "buttons") {
                const buttons = {
                    dpad_left: c(data[7]),
                    dpad_up: c(data[4]),
                    dpad_right: c(data[6]),
                    dpad_down: c(data[5]),
                    button_a: c(data[12]),
                    button_b: c(data[13]),
                    button_plus: c(data[3]),
                    button_home: c(data[8]),
                    button_minus: c(data[11]),
                    number_one: c(data[14]),
                    number_two: c(data[15]),
                };
                this.emit("data.button", buttons);
            }
        }
        //endregion
    })();
}

module.exports = apply;
