//k2N4/3N4/1P1N4/1P1N4/1P1N4/1P1N4/1P1N4/7K w - - 0 1
/// basically a grid, which has a population of vectors.. who could have 
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
//import { timingSafeEqual } from "crypto";
// for purposes of this code. A Vector is a carrier of a virus, not a data structure
var Params = /** @class */ (function () {
    function Params() {
    }
    return Params;
}());
var params = new Params();
var Region = /** @class */ (function () {
    function Region(width, height, scale) {
        console.log("constructing population.. " + width + "," + height + "scale:" + scale);
        this.scale = scale;
        this.width = Math.floor(width / scale);
        this.height = Math.floor(height / scale);
        this.people = new Map();
        this.createVectors();
        this.days = 0;
        this.deaths = 0;
        this.counter = 0;
        this.movements = 0; // 12 to a day. 
        this.infected = 0;
        this.recovered = 0;
        console.log("population movement with " + params.movement);
    }
    Region.prototype.xyToIndex = function (x, y) {
        return y * this.width + x;
    };
    Region.prototype.indexToXY = function (i) {
        return { x: i % this.width, y: Math.floor(i / this.width) };
    };
    Region.prototype.logVector = function (t, v) {
        console.log(t + " V - (x,y) - (" + v.x + "," + v.y + ")");
    };
    Region.prototype.createVectors = function () {
        for (var p = 0; p < params.population; p++) {
            var x = Math.floor(Math.random() * this.width);
            var y = Math.floor(Math.random() * this.height);
            var vv = new VirusVector(x, y, this.width, this.height);
            var h = vv.hash();
            // if random position is taken, just scoot along in linear fashion to find a spot. 
            if (this.people.has(h)) {
                var nxt = h;
                while (this.people.has(nxt)) {
                    nxt = nxt + 1 % (this.width * this.height);
                }
                var n = this.indexToXY(nxt);
                vv = new VirusVector(n.x, n.y, this.width, this.height);
                h = nxt;
            }
            if (p == 0) {
                vv.infectedDays = 1;
            }
            this.people.set(h, vv);
        }
    };
    // first spreads infection to anyone in proximity if infectedDays bigger than 1 day.
    // kills people (vectors) according the accepted probability/death rate. 
    // incremements the infected days
    // recovers people after a set no. days. 
    // moves all people if they can move in the direction they are going
    // their direction changes by drunken sailor rules.
    //  
    Region.prototype.movePeople = function () {
        var e_1, _a;
        this.movements++;
        this.days = Math.floor(this.movements / 12);
        var spread = 1;
        var moved = 0;
        var couldntMove = 0;
        var nextGen = new Map();
        try {
            for (var _b = __values(this.people.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var v = _c.value;
                if (v.died) {
                    nextGen.set(v.hash(), v);
                    continue;
                }
                // after 1 infected day we can infect others
                // TODO an infect neighbours method which uses a parameter for infection rate. 
                if (v.infectedDays > 1) {
                    // get neighbours and infect n of them.
                    this.infectNeighbours(v);
                    if (this.movements % 12 == 0) {
                        v.infectedDays++;
                    }
                }
                // if we are infected, increment the days
                // if we make it to 25 days.. we recover
                if (v.infectedDays > v.durationOfDisease) {
                    v.infectedDays = 0;
                    v.infected = false;
                    if (v.willDie) {
                        v.died = true;
                    }
                    else {
                        v.recovered = true;
                        this.infected--;
                        this.recovered++;
                    }
                }
                // now move in the "drunken" direction if can (and if not dead)
                // we check our current map and the new one, we don't want to clobber
                // any people in the next gen. 
                if (!v.died) {
                    var nm = v.getNextMove();
                    if (!this.people.has(this.xyToIndex(nm.x, nm.y))
                        && !nextGen.has(this.xyToIndex(nm.x, nm.y))) {
                        v.executeMove();
                        // now give it the chance to change direction next time. 
                        v.randomWalk();
                        moved++;
                    }
                    else {
                        // if we can't move and we don't force a direction change
                        // then we get "clumping". 
                        // we always reduce clumping by some factor. 
                        if (params.preventClumping) {
                            v.changeDirection();
                        }
                        else if (Math.random() < 0.25) {
                            v.changeDirection();
                        }
                    }
                }
                nextGen.set(v.hash(), v);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (this.people.size != nextGen.size) {
            console.log("Man Overboard.. " + (this.people.size - nextGen.size));
        }
        this.people = nextGen;
        this.counter++;
        if (this.counter > 25) {
            this.counter = 0;
        }
    };
    Region.prototype.infectNeighbours = function (v) {
        for (var x = -1; x < 2; x++) {
            for (var y = -1; y < 3; y++) {
                if ((x != 0 || y != 0)) {
                    var h = this.xyToIndex((x + v.x + v.width) % v.width, (y + v.y + v.height) % v.height);
                    if (this.people.has(h)) {
                        var neighb = this.people.get(h);
                        if (!neighb.infected && !neighb.recovered && !neighb.died && (v.infectees < v.maxNeighboursCanInfect)) {
                            //random 50% chance of affecting a particular neighbour, but only to the maximum
                            // as dictated by the infection rate
                            neighb.infected = true;
                            neighb.infectedDays = 0;
                            v.infectees++;
                            this.infected++;
                        }
                    }
                }
            }
        }
    };
    Region.prototype.drawGridOnCanvasContext = function (ctxt) {
        var e_2, _a, e_3, _b;
        var tote = 0;
        ctxt.fillStyle = "#00ffff";
        var color = "#00ffff";
        try {
            for (var _c = __values(this.people.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var v = _d.value;
                color = '#0000ff'; // blue
                if (v.infectedDays > 0)
                    color = "#ff0000"; // red
                if (v.recovered)
                    color = "#22AA22"; // green
                if (v.died)
                    color = "#9933FF";
                ctxt.fillStyle = color;
                if (v.oldX != v.x || v.oldY != v.y) {
                    ctxt.clearRect(v.oldX * this.scale, v.oldY * this.scale, this.scale, this.scale);
                }
                ctxt.fillRect(v.x * this.scale, v.y * this.scale, this.scale, this.scale);
                //console.log("x and y are "+v.x+","+v.y)
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this.testIdxConversion();
        // dashboard
        var border = 2;
        var text = ["Population:" + params.population,
            "Days:" + this.days,
            "Infected: " + this.infected,
            "Deaths:" + this.deaths,
            "Recovered:" + this.recovered];
        var fontSize = 3 * this.scale;
        var textW = fontSize / 3 * 2;
        var textH = fontSize;
        var longestText = 0;
        try {
            for (var text_1 = __values(text), text_1_1 = text_1.next(); !text_1_1.done; text_1_1 = text_1.next()) {
                var t = text_1_1.value;
                if (t.length > longestText)
                    longestText = t.length;
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (text_1_1 && !text_1_1.done && (_b = text_1["return"])) _b.call(text_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        var dashX = (this.width * this.scale) - (longestText * textW);
        var dashY = textH * 3;
        ctxt.font = "" + fontSize + "px Verdana";
        //ctxt.fillStyle = "#FFF111"
        ctxt.clearRect(dashX - border, dashY - border, longestText * textW, textH * text.length + 2 * border);
        ctxt.fillStyle = "#000000";
        for (var pos = 0; pos < text.length; pos++) {
            ctxt.fillText(text[pos], dashX, dashY + textH * (pos + 1));
        }
    };
    Region.prototype.testIdxConversion = function () {
        var e_4, _a;
        try {
            for (var _b = __values(this.people.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var k = _c.value;
                var v = this.people.get(k);
                if (k != v.hash()) {
                    console.log("oh dear, hash doesn't match .. " + k + " " + v.hash());
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
    };
    return Region;
}());
/// keeps going in the same direction with a low probability of changing (drunken walk)
var VirusVector = /** @class */ (function () {
    function VirusVector(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.recovered = false;
        this.infectedDays = 0;
        this.died = false;
        this.direction = { x: 0, y: 0 };
        this.direction.x = Math.floor(Math.random() * 3) - 1;
        this.direction.y = Math.floor(Math.random() * 3) - 1;
        this.infected = false;
        this.infectees = 0;
        // turn a real no. into a random int with the same probabilistic outcome. 
        var n = params.contagionRate;
        this.maxNeighboursCanInfect = Math.floor(n) + ((Math.random() < (n - Math.floor(n))) ? 1 : 0);
        this.willDie = Math.random() * 100 < params.mortalityRate;
        // when we reach this duration, we either die or recover depending on willdie
        this.durationOfDisease = Math.floor(7 + Math.random() * 14);
    }
    /// gets an x and y coord e.g. using the direction + width of grid. 
    // (0,-1) or (1,1) allows to test if there is something else at that point. 
    VirusVector.prototype.getNextMove = function () {
        var xd = (this.x + this.direction.x + this.width) % this.width;
        var yd = (this.y + this.direction.y + this.height) % this.height;
        return { x: xd, y: yd };
    };
    // actually makes the move
    VirusVector.prototype.executeMove = function () {
        var mv = this.getNextMove();
        //console.log("Next move is " + mv.x +","+mv.y)
        this.oldX = this.x;
        this.oldY = this.y;
        this.x = mv.x;
        this.y = mv.y;
    };
    // changes direction based on a random value. 
    VirusVector.prototype.randomWalk = function () {
        if (Math.round(Math.random() * 10) < params.movement)
            return;
        this.changeDirection();
    };
    // change the direction vector randomly 
    VirusVector.prototype.changeDirection = function () {
        this.direction.x = 0;
        this.direction.y = 0;
        // might both be zero
        this.direction.x = Math.floor(Math.random() * 3) - 1;
        this.direction.y = Math.floor(Math.random() * 3) - 1;
        // for debugging purposes. Let's remove 0 directions.
        if (this.direction.x == 0 && this.direction.y == 0) {
            this.direction.x = 1;
        }
    };
    //use the hash to store in a set for quicker calculation.
    VirusVector.prototype.hash = function () {
        return this.y * this.width + this.x;
    };
    return VirusVector;
}());
// abstraction of our canvas element. 
var Canvas = /** @class */ (function () {
    function Canvas() {
        this.SCALE = 5;
        this.delay = 500;
        this.timeStamp = 0;
        console.log("Constructing..");
        this.x = 0;
        this.populationSize = params.population;
        this.checkDays = -1;
        this.canvas = document.getElementById('canvas');
        console.log("canvas =" + this.canvas);
        this.context = this.canvas.getContext("2d");
        console.log("context = " + this.context);
        this.context.lineWidth = 1;
        this.scale = 5;
        this.movement = params.movement;
    }
    Canvas.prototype.watchdog = function () {
        // annoyingly we need this because the "requestAnimationFrame" method fails from
        //time to time. 
        if (this.terminate) {
            clearInterval(this.intervalWatchdog);
        }
        if (this.region.days >= this.checkDays) {
            this.checkDays++;
            return;
        }
        //console.log("Woof!! Woof!! Wooof!!!  RRRRRRRRR....")
        this.checkDays = this.region.days - 1;
        this.redraw();
    };
    Canvas.prototype.clear = function () {
        if (this.region != null) {
            this.terminate = true;
        }
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };
    Canvas.prototype.start = function () {
        //must garbage collect the old one. 
        this.region = new Region(this.canvas.width, this.canvas.height, this.SCALE);
        this.redraw();
        this.intervalWatchdog = setInterval(this.watchdog.bind(this), this.delay);
    };
    Canvas.prototype.redraw = function () {
        //console.log("redraw..")
        var now = Date.now();
        if (now - this.timeStamp > this.delay) {
            this.timeStamp = now;
            this.region.drawGridOnCanvasContext(this.context);
            this.region.movePeople();
        }
        window.requestAnimationFrame(this.redraw.bind(this));
    };
    return Canvas;
}());
//new Canvas().test();
