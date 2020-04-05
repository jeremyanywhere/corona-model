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
//
// for purposes of this code. A Vector is a carrier of a virus, not a data structure
function normalDist(range) {
    var u = 0, v = 0;
    while (u === 0)
        u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0)
        v = Math.random();
    var num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0)
        return normalDist(range); // resample between 0 and 1
    return num * range * 2;
}
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
        this.width = Math.floor(width);
        this.height = Math.floor(height);
        this.people = new Map();
        this.createVectors();
        this.days = 0;
        this.deaths = 0;
        this.counter = 0;
        this.movements = 0; // 12 to a day. 
        this.infected = 0;
        this.currentInfected = 0;
        this.recovered = 0;
        this.peak = 0;
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
            var vv = new VirusVector("vv" + p, x, y, this.width, this.height);
            var h = vv.hash();
            // if random position is taken, just scoot along in linear fashion to find a spot. 
            if (this.people.has(h)) {
                var nxt = h;
                while (this.people.has(nxt)) {
                    nxt = nxt + 1 % (this.width * this.height);
                }
                var n = this.indexToXY(nxt);
                //vv = new VirusVector(n.x,n.y,this.width, this.height) - is this necessary? why not change indices..
                vv.x = n.x;
                vv.y = n.y;
                h = nxt;
            }
            if (p == 0) {
                vv.infectedDays = 1;
                vv.infected = true;
                this.infected++;
                this.currentInfected++;
            }
            this.people.set(h, vv);
            //console.log("created VVector at "+ vv.x + "," + vv.y)
        }
        this.createSVGElements();
    };
    Region.prototype.createSVGElements = function () {
        var e_1, _a;
        var svgi = document.getElementById('svgId');
        var circ;
        try {
            for (var _b = __values(this.people.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var v = _c.value;
                circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circ.id = v.id;
                circ.setAttribute("cx", "" + v.x);
                circ.setAttribute("cy", "" + v.y);
                circ.setAttribute('r', "0.5");
                circ.setAttribute("style", "fill:blue;stroke-width:0");
                svgi.appendChild(circ);
                v.svgElement = circ;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
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
        var e_2, _a;
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
                // if we are infected then we can infect others, and must count the days. 
                if (v.infected) {
                    // after 1 infected day we can infect others
                    if (v.infectedDays > 1) {
                        // get neighbours and infect n of them.
                        this.infectNeighbours(v);
                    }
                    if (this.movements % 12 == 0) {
                        v.infectedDays++;
                    }
                    // if we make it to our disease duration we recover or die
                    if (v.infectedDays > v.durationOfDisease) {
                        v.infectedDays = 0;
                        v.infected = false;
                        if (v.willDie) {
                            v.died = true;
                            this.deaths++;
                        }
                        else {
                            v.recovered = true;
                            this.recovered++;
                            this.currentInfected--;
                        }
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
                        else if (Math.random() < 0.1) {
                            v.changeDirection();
                        }
                    }
                }
                nextGen.set(v.hash(), v);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
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
                            this.currentInfected++;
                            if (this.peak < this.currentInfected) {
                                this.peak = this.currentInfected;
                            }
                        }
                    }
                }
            }
        }
    };
    Region.prototype.renderGridInSVG = function (svg) {
        var e_3, _a;
        var circ;
        var color;
        try {
            //var vv: VirusVector
            //console.log("Children of DUNE (svg) "+svg.childElementCount)
            for (var _b = __values(this.people.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var v = _c.value;
                //console.log("looking for circle in vector - "+v.id+ " "+ v.svgElement)
                circ = v.svgElement;
                circ.setAttribute('cx', "" + v.x);
                circ.setAttribute('cy', "" + v.y);
                color = "#2222FF"; // blue
                if (v.infected)
                    color = "#FF0000"; // red
                //if (v.recovered) console.log("Oh yes.. I have Recovered!")
                if (v.recovered)
                    color = "#22AA22"; // green
                if (v.died)
                    color = "#AA00AA";
                circ.setAttribute("style", ("fill:" + color + ";stroke-width:0"));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        this.drawBanner();
    };
    Region.prototype.drawBanner = function () {
        document.getElementById("deathbanner").innerHTML = ("Deaths: " + this.deaths);
        document.getElementById("infectedbanner").innerHTML = ("Total Infected: " + this.infected);
        document.getElementById("recoveredbanner").innerHTML = ("Recovered: " + this.recovered);
        document.getElementById("populationbanner").innerHTML = ("Population: " + this.people.size);
        document.getElementById("daybanner").innerHTML = ("Days: " + this.days);
        document.getElementById("peakbanner").innerHTML = ("Peak Infection: " + (Math.round((this.peak / this.people.size) * 1000) / 10) + "%");
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
    function VirusVector(id, x, y, width, height) {
        this.id = id;
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
        var n = normalDist(params.contagionRate);
        // turn a real no. into a random int with the same probabilistic outcome. 
        this.maxNeighboursCanInfect = Math.floor(n) + ((Math.random() < (n - Math.floor(n))) ? 1 : 0);
        // when we reach this duration, we either die or recover depending on willdie
        this.willDie = (Math.random() * 100 < params.mortalityRate);
        if (this.willDie) {
            // on average deaths will occur in shorter time frame than recovery. 
            this.durationOfDisease = normalDist(params.avgTimeToDeath);
        }
        else {
            this.durationOfDisease = normalDist(params.avgTimeToRecovery);
        }
        this.walkFactor = Math.pow(2, 8);
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
        if (Math.random() * 100 > params.movement)
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
        this.SCALE = 1;
        this.timeStamp = 0;
        console.log("Constructing..");
        this.x = 0;
        this.populationSize = params.population;
        this.checkDays = -1;
        //this.canvas = document.getElementById('canvas') as
        //         HTMLCanvasElement;
        this.svg = document.getElementById('svgId');
        //console.log(`canvas =${this.canvas}`)
        //this.context = this.canvas.getContext("2d");
        //console.log(`context = ${this.context}`)
        //this.context.lineWidth = 1;
        this.scale = 1;
        this.movement = params.movement;
    }
    Canvas.prototype.watchdog = function () {
        // annoyingly we need this because the "requestAnimationFrame" method fails from
        //time to time. 
        if (params.reset) {
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
        var e_5, _a;
        var svgi = document.getElementById('svgId');
        try {
            for (var _b = __values(this.region.people.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var v = _c.value;
                svgi.removeChild(v.svgElement);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
    };
    Canvas.prototype.start = function () {
        this.dumpParams();
        var viewbox = this.svg.getAttributeNS("http://www.w3.org/2000/svg", 'viewbox');
        console.log("viewbox x is " + viewbox);
        this.region = new Region(160, 120, this.SCALE);
        this.redraw();
        //this.intervalWatchdog = setInterval(this.watchdog.bind(this), params.speed);
    };
    Canvas.prototype.startOLD = function () {
        //must garbage collect the old one. 
        this.dumpParams();
        this.region = new Region(this.canvas.clientWidth, this.canvas.clientHeight, this.SCALE);
        this.redraw();
        this.intervalWatchdog = setInterval(this.watchdog.bind(this), params.speed);
    };
    Canvas.prototype.dumpParams = function () {
        console.log("Parameters are:");
        console.log("   speed " + params.speed);
        console.log("   reset " + params.reset);
        console.log("   preventClumping " + params.preventClumping);
        console.log("   contagionRate " + params.contagionRate);
        console.log("   mortalityRate " + params.mortalityRate);
        console.log("   movement " + params.movement);
        console.log("   Length " + params.simulationLength);
        console.log("   Time to Death" + params.avgTimeToDeath);
        console.log("   Time to Recovery" + params.avgTimeToRecovery);
    };
    Canvas.prototype.redraw = function () {
        //console.log("redraw..")
        var now = Date.now();
        if (now - this.timeStamp > params.speed) {
            this.timeStamp = now;
            this.region.renderGridInSVG(this.svg);
            if (this.region.days < params.simulationLength)
                this.region.movePeople();
        }
        if (!params.reset) {
            window.requestAnimationFrame(this.redraw.bind(this));
        }
        else {
            this.clear();
        }
    };
    return Canvas;
}());
//new Canvas().test();
