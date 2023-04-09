const apply = (wiimote) => {
    wiimote._processData = (function() {
        //region HANDSHAKE
        // stolen straight from wiibrew, thanks guys
        this.read([0xA4, 0x00, 0x24], [0x18]);
        const balanceHandler = data => {
            if(data[0] !== 0x21) return;
            const packet = data;
            var len = packet[3] / 16 + 1;
            var nums = [...packet.slice(6, packet.length)];
            if (len === 16) {
              for (let item = 0; item <= 7; item++) {
                    const start = item * 2;
                    const end = start + 1;
                    const value = (nums[start] << 8) + nums[end];
                    const calibLevel = Math.floor(item / 4);
                    const calibPoint = item % 4;
                    this._balance[calibPoint][calibLevel] = value;
                }
            } else {
                for (let item = 0; item <= 3; item++) {
                    const start = item * 2;
                    const end = start + 1;
                    const value = (nums[start] << 8) + nums[end];
                    item += 8;
                    const calibLevel = Math.floor(item / 4);
                    const calibPoint = item % 4;
                    this._balance[calibPoint][calibLevel] = value;
                }
            }
            if(this._balance.flat().filter(x => x !== 0).length === 12) {
                // ready for use
            }
        };
        this.on("raw_data", balanceHandler);
        //endregion
        //region REFLECTION_PROCESS
        var cached = wiimote._processData;
        return function() {
            cached.apply(this,arguments);
            const type = arguments[0];
            const data = arguments[1];
            const buffer = arguments[0];
            const c = check => check === "1";
            if(type === "extension") {
                if(wiimote.extensionType === "balance") {
                    let weight = ["a","b","c","d"];
                    const bals = [...buffer.slice(0,8)];
                    for (let point = 0; point <= 3; point++) {
                        const rawPower = (bals[point*2] << 8)+bals[(point*2)+1];
                        if(rawPower < this._balance[point][0]) {
                            weight[point] = 0;
                        } else {
                            if(rawPower < this._balance[point][1]) {
                                weight[point] = 17 * ((rawPower - this._balance[point][0]) / (this._balance[point][1] - this._balance[point][0]));
                            } else {
                                weight[point] = 17 + 17 * ((rawPower - this._balance[point][1]) / (this._balance[point][2] - this._balance[point][1]));
                            }
                        }
                    };
                    const balance = {
                        weight: weight.reduce((a,b) => a+b, 0),
                        weight_topright: weight[0],
                        weight_bottomright: weight[1],
                        weight_topleft: weight[2],
                        weight_bottomleft: weight[3],
                    }
                    this.emit("data.balance", balance);
                }
            }
        }
        //endregion
    })();
}

module.exports = apply;
