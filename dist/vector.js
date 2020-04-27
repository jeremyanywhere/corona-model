"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function normalDist(range) {
    let u = 0, v = 0;
    while (u === 0)
        u = Math.random();
    while (v === 0)
        v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5;
    if (num > 1 || num < 0)
        return normalDist(range);
    return num * range * 2;
}
class Params {
}
let params = new Params();
class Region {
    constructor(width, height, scale) {
        console.log("constructing population.. " + width + "," + height + "scale:" + scale);
        this.scale = scale;
        this.width = Math.floor(width);
        this.height = Math.floor(height);
        this.people = new Map();
        this.createVectors();
        this.days = 0;
        this.deaths = 0;
        this.counter = 0;
        this.movements = 0;
        this.infected = 0;
        this.currentInfected = 0;
        this.recovered = 0;
        this.peak = 0;
    }
    xyToIndex(x, y) {
        return y * this.width + x;
    }
    indexToXY(i) {
        return { x: i % this.width, y: Math.floor(i / this.width) };
    }
    logVector(t, v) {
        console.log(t + " V - (x,y) - (" + v.x + "," + v.y + ")");
    }
    createVectors() {
        for (let p = 0; p < params.population; p++) {
            let x = Math.floor(Math.random() * this.width);
            let y = Math.floor(Math.random() * this.height);
            let vv = new VirusVector("vv" + p, x, y, this.width, this.height);
            let h = vv.hash();
            if (this.people.has(h)) {
                let nxt = h;
                while (this.people.has(nxt)) {
                    nxt = nxt + 1 % (this.width * this.height);
                }
                let n = this.indexToXY(nxt);
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
        }
        this.createSVGElements();
    }
    createSVGElements() {
        var svgi = document.getElementById('svgId');
        var circ;
        for (let v of this.people.values()) {
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
    movePeople() {
        this.movements++;
        this.days = Math.floor(this.movements / 12);
        let spread = 1;
        let moved = 0;
        let couldntMove = 0;
        var nextGen = new Map();
        for (let v of this.people.values()) {
            if (v.died) {
                nextGen.set(v.hash(), v);
                continue;
            }
            if (v.infected) {
                if (v.infectedDays > 1) {
                    this.infectNeighbours(v);
                }
                if (this.movements % 12 == 0) {
                    v.infectedDays++;
                }
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
            if (!v.died) {
                let nm = v.getNextMove();
                if (!this.people.has(this.xyToIndex(nm.x, nm.y))
                    && !nextGen.has(this.xyToIndex(nm.x, nm.y))) {
                    v.executeMove();
                    v.walk();
                    moved++;
                }
                else {
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
        if (this.people.size != nextGen.size) {
            console.log("Man Overboard.. " + (this.people.size - nextGen.size));
        }
        this.people = nextGen;
        this.counter++;
        if (this.counter > 25) {
            this.counter = 0;
        }
    }
    infectNeighbours(v) {
        for (let x = -1; x < 2; x++) {
            for (let y = -1; y < 3; y++) {
                if ((x != 0 || y != 0)) {
                    let h = this.xyToIndex((x + v.x + v.width) % v.width, (y + v.y + v.height) % v.height);
                    if (this.people.has(h)) {
                        let neighb = this.people.get(h);
                        if (!neighb.infected && !neighb.recovered && !neighb.died && (v.infectees < v.maxNeighboursCanInfect)) {
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
    }
    renderGridInSVG(svg) {
        var circ;
        var color;
        for (let v of this.people.values()) {
            circ = v.svgElement;
            circ.setAttribute('cx', "" + v.x);
            circ.setAttribute('cy', "" + v.y);
            color = "#2222FF";
            if (v.infected)
                color = "#FF0000";
            if (v.recovered)
                color = "#22AA22";
            if (v.died)
                color = "#AA00AA";
            circ.setAttribute("style", ("fill:" + color + ";stroke-width:0"));
        }
        this.drawBanner();
    }
    drawBanner() {
        document.getElementById("deathbanner").innerHTML = ("Deaths: " + this.deaths);
        document.getElementById("infectedbanner").innerHTML = ("Total Infected: " + this.infected);
        document.getElementById("recoveredbanner").innerHTML = ("Recovered: " + this.recovered);
        document.getElementById("populationbanner").innerHTML = ("Population: " + this.people.size);
        document.getElementById("daybanner").innerHTML = ("Days: " + this.days);
        document.getElementById("peakbanner").innerHTML = ("Peak Infection: " + (Math.round((this.peak / this.people.size) * 1000) / 10) + "%");
    }
    testIdxConversion() {
        for (let k of this.people.keys()) {
            let v = this.people.get(k);
            if (k != v.hash()) {
                console.log("oh dear, hash doesn't match .. " + k + " " + v.hash());
            }
        }
    }
}
class VirusVector {
    constructor(id, x, y, width, height) {
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
        this.steps = 0;
        let n = normalDist(params.contagionRate);
        this.maxNeighboursCanInfect = Math.floor(n) + ((Math.random() < (n - Math.floor(n))) ? 1 : 0);
        this.willDie = (Math.random() * 100 < params.mortalityRate);
        if (this.willDie) {
            this.durationOfDisease = normalDist(params.avgTimeToDeath);
        }
        else {
            this.durationOfDisease = normalDist(params.avgTimeToRecovery);
        }
    }
    getNextMove() {
        let xd = (this.x + this.direction.x + this.width) % this.width;
        let yd = (this.y + this.direction.y + this.height) % this.height;
        return { x: xd, y: yd };
    }
    executeMove() {
        let mv = this.getNextMove();
        this.oldX = this.x;
        this.oldY = this.y;
        this.x = mv.x;
        this.y = mv.y;
    }
    walk() {
        if (this.steps < params.movement) {
            this.steps++;
            return;
        }
        this.changeDirection();
    }
    changeDirection() {
        this.steps = 0;
        this.direction.x = 0;
        this.direction.y = 0;
        while (this.direction.x == 0 && this.direction.y == 0) {
            this.direction.x = Math.floor(Math.random() * 3) - 1;
            this.direction.y = Math.floor(Math.random() * 3) - 1;
        }
    }
    hash() {
        return this.y * this.width + this.x;
    }
}
class Canvas {
    constructor() {
        this.SCALE = 1;
        this.timeStamp = 0;
        console.log("Constructing..");
        this.x = 0;
        this.populationSize = params.population;
        this.checkDays = -1;
        this.svg = document.getElementById('svgId');
        this.scale = 1;
        this.movement = params.movement;
        this.simulationChartAxis = -1;
    }
    watchdog() {
        if (params.reset) {
            clearInterval(this.intervalWatchdog);
        }
        if (this.region.days >= this.checkDays) {
            this.checkDays++;
            return;
        }
        this.checkDays = this.region.days - 1;
        this.redraw();
    }
    clear() {
        var svgi = document.getElementById('svgId');
        for (let v of this.region.people.values()) {
            svgi.removeChild(v.svgElement);
        }
    }
    start() {
        this.dumpParams();
        var viewbox = this.svg.getAttributeNS("http://www.w3.org/2000/svg", 'viewbox');
        console.log("viewbox x is " + viewbox);
        this.region = new Region(300, 120, this.SCALE);
        this.chart = new Chart('Model over time period', 'Percentage of modelled population', "100%", "100%");
        this.chart.initChart();
        this.chart.draw();
        this.redraw();
    }
    dumpParams() {
        console.log("Parameters are:");
        console.log("   speed " + params.speed);
        console.log("   reset " + params.reset);
        console.log("   preventClumping " + params.preventClumping);
        console.log("   contagionRate " + params.contagionRate);
        console.log("   mortalityRate " + params.mortalityRate);
        console.log("   movement/distancing " + params.movement);
        console.log("   Length " + params.simulationLength);
        console.log("   Time to Death" + params.avgTimeToDeath);
        console.log("   Time to Recovery" + params.avgTimeToRecovery);
    }
    redraw() {
        let now = Date.now();
        if (now - this.timeStamp > params.speed) {
            this.timeStamp = now;
            this.region.renderGridInSVG(this.svg);
            if (this.region.days < params.simulationLength)
                this.region.movePeople();
            let unit = params.simulationLength / this.chart.X_AXIS_SCALE;
            if (Math.floor(this.region.days / unit) > this.simulationChartAxis) {
                this.simulationChartAxis = Math.floor(this.region.days / unit);
                let infectPer = ((this.region.infected - (this.region.recovered + this.region.deaths)) / params.population) * 100;
                let deathPer = (this.region.deaths / params.population) * 100;
                let recoveredPer = (this.region.recovered / params.population) * 100;
                this.chart.addRow([this.region.days, infectPer, recoveredPer, deathPer]);
                this.chart.draw();
            }
        }
        if (!params.reset) {
            window.requestAnimationFrame(this.redraw.bind(this));
        }
        else {
            this.clear();
        }
    }
}
class Chart {
    constructor(graphTitle, subTitle, height, width) {
        this.X_AXIS_SCALE = 40;
        this.options = {
            chart: {
                title: graphTitle,
                subtitle: subTitle
            },
            width: width,
            height: height
        };
        this.gChart = new params.googleVisualization.LineChart(document.getElementById('linechart_material'));
    }
    addRow(row) {
        this.data.addRow(row);
    }
    draw() {
        this.gChart.draw(this.data, this.options);
    }
    initChart() {
        this.data = new params.googleVisualization.DataTable();
        this.data.addColumn('number', 'Days');
        this.data.addColumn('number', 'Infected %');
        this.data.addColumn('number', 'Recovered %');
        this.data.addColumn('number', 'Deaths %');
        this.data.addRow([0, 0, 0, 0]);
    }
}
;
//# sourceMappingURL=vector.js.map