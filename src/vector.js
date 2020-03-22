"use strict";
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
exports.__esModule = true;
// for purposes of this code. A Vector is a carrier of a virus, not a data structure
var Region = /** @class */ (function () {
    function Region(population, x, y, scale) {
        console.log("constructing population.. " + x + "," + y + "scale:" + scale);
        this.scale = scale;
        this.population = population;
        this.width = Math.floor(x / scale);
        this.height = Math.floor(y / scale);
        this.people = new Map();
        this.createVectors();
        this.days = 0;
        this.deaths = 0;
        this.counter = 0;
        this.movements = 0; // 12 to a day. 
        this.infected = 0;
        this.recovered = 0;
    }
    Region.prototype.xyToIndex = function (x, y) {
        return y * this.width + x;
    };
    Region.prototype.indexToXY = function (i) {
        return { x: i % this.width, y: Math.floor(i / this.width) };
    };
    Region.prototype.createVectors2 = function () {
        var v1 = new VirusVector(50, 50, this.width, this.height);
        v1.infectedDays = 2;
        var n = [];
        var h = v1.hash();
        this.people.set(h, v1);
        this.logVector("first one..   :", v1);
        for (var x = 1; x < 5; x++) {
            var p = this.indexToXY(x * this.width + h);
            var nv = new VirusVector(p.x, p.y, this.width, this.height);
            this.logVector("   other ones.:", nv);
            this.people.set(h + x, nv);
        }
    };
    Region.prototype.logVector = function (t, v) {
        console.log(t + " V - (x,y) - (" + v.x + "," + v.y + ")");
    };
    Region.prototype.createVectors = function () {
        for (var p = 0; p < this.population; p++) {
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
    Region.prototype.advanceDay2 = function () {
        return;
    };
    Region.prototype.movePeople = function () {
        var e_1, _a;
        this.movements++;
        if (this.movements > 11) {
            this.movements = 0;
            this.days++;
        }
        var moved = 0;
        var couldntMove = 0;
        var nextGen = new Map();
        try {
            for (var _b = __values(this.people.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var v = _c.value;
                // after 1 infected day we can infect others
                if (v.infectedDays > 1) {
                    // get neighbours and infect 3 of them.
                    var spread = 0;
                    for (var x = -1; x < 2; x++) {
                        for (var y = -1; y < 3; y++) {
                            if ((x != 0 || y != 0) && spread < 3) {
                                var h = this.xyToIndex((x + v.x + v.width) % v.width, (y + v.y + v.height) % v.height);
                                if (this.people.has(h)) {
                                    spread++;
                                    var neighb = this.people.get(h);
                                    if (neighb.infectedDays < 1 && !neighb.recovered) {
                                        neighb.infectedDays = 1;
                                        this.infected++;
                                    }
                                }
                            }
                        }
                    }
                    // chance of dying every day adds up to about 1.4% chance. 
                    if (Math.random() < 0.000664) {
                        v.died = false; // true.. just debugging
                        this.deaths++;
                        //console.log("aaaaaaaarrrrrgggghhh - " + this.deaths)
                    }
                }
                // if we are infected, increment the days
                // if we make it to 20.. we recover
                if (!v.died && v.infectedDays > 0) {
                    if (v.infectedDays < 80) {
                        v.infectedDays++;
                    }
                    else {
                        v.infectedDays = 0;
                        v.recovered = true;
                        this.infected--;
                        this.recovered++;
                    }
                }
                // now move in the "drunken" direction if can and if not dead
                // we check our current map and the new one, we don't want to clobber
                // any people in the next gen. 
                couldntMove++;
                var nm = v.getNextMove();
                if (!v.died
                    && !this.people.has(this.xyToIndex(nm.x, nm.y))
                    && !nextGen.has(this.xyToIndex(nm.x, nm.y))) {
                    //this.logVector("before", v)
                    v.executeMove();
                    //this.logVector("after", v)
                    moved++;
                    couldntMove--;
                }
                nextGen.set(v.hash(), v);
                //console.log("nextGen size is " + nextGen.size)
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.people = nextGen;
        this.counter++;
        if (this.counter > 25) {
            this.counter = 0;
        }
    };
    Region.prototype.drawGridOnCanvasContext = function (ctxt) {
        var e_2, _a, e_3, _b;
        ctxt.fillStyle = "#000000";
        var color = '';
        try {
            for (var _c = __values(this.people.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var v = _d.value;
                color = '#0000ff'; // blue
                if (v.infectedDays > 0)
                    color = '#ff0000'; // red
                if (v.recovered)
                    color = '#22AA22'; // green
                if (v.died)
                    color = '#222222'; //black/gray
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
        // dashboard
        var dashX = this.width * .9 * this.scale;
        var dashY = this.width * .1 * this.scale;
        var border = 1;
        var text = ["Population:" + this.population,
            "Days:" + this.days,
            "Infected: " + this.infected,
            "Deaths:" + this.deaths,
            "Recovered:" + this.recovered];
        var textW = 50;
        var textH = 10;
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
        ctxt.font = "" + this.scale * 3 + "px Verdana";
        ctxt.fillStyle = "#FFFFFF";
        ctxt.fillRect(dashX - border, dashY - border - (this.scale * 3), longestText * 2 * this.scale, textH * 2 * text.length);
        ctxt.fillStyle = "#000000";
        for (var pos = 0; pos < text.length; pos++) {
            ctxt.fillText(text[pos], dashX, dashY + textH * 2 * pos);
        }
    };
    Region.prototype.dumpGrid = function () {
    };
    Region.prototype.testIdxConversion = function () {
    };
    return Region;
}());
/// keeps going in the same direction with a low probability of changing (drunken walk)
var VirusVector = /** @class */ (function () {
    function VirusVector(x, y, width, height) {
        // infected randomly by proximity (neighbouring cell) with infection probability defined by 
        // WHO reports.  
        this.DRUNKNESS = 0.05;
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
    }
    /// gets an x and y coord e.g. using the direction + width of grid. 
    // (0,-1) or (1,1) allows to test if there is something else at that point. 
    VirusVector.prototype.getNextMove = function () {
        var xd = (this.x + this.direction.x + this.width) % this.width;
        var yd = (this.y + this.direction.y + this.height) % this.height;
        this.changeDirection();
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
    // change direction randomly according to random walk rules. 
    VirusVector.prototype.changeDirection = function () {
        if (Math.random() > this.DRUNKNESS)
            return;
        this.direction.x = 0;
        this.direction.y = 0;
        // might both be zero
        this.direction.x = Math.floor(Math.random() * 3) - 1;
        this.direction.y = Math.floor(Math.random() * 3) - 1;
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
        this.delay = 500;
        this.timeStamp = 0;
        console.log("Constructing..");
        this.x = 0;
        this.populationSize = 1500;
        this.checkDays = -1;
        this.canvas = document.getElementById('canvas');
        console.log("canvas =" + this.canvas);
        this.context = this.canvas.getContext("2d");
        console.log("context = " + this.context);
        this.context.lineWidth = 1;
        this.scale = 5;
    }
    Canvas.prototype.watchdog = function () {
        // annoyingly we need this because the "requestAnimationFrame" method fails from
        //time to time. 
        if (this.region.days >= this.checkDays) {
            this.checkDays++;
            return;
        }
        //console.log("Woof!! Woof!! Wooof!!!  RRRRRRRRR....")
        this.checkDays = this.region.days - 1;
        this.redraw();
    };
    Canvas.prototype.start = function () {
        console.log("Starting..");
        this.region = new Region(this.populationSize, this.canvas.width, this.canvas.height, this.scale);
        this.redraw();
        setInterval(this.watchdog.bind(this), this.delay);
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
new Canvas().start();
//new Canvas().test();
