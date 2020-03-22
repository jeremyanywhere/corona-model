
/// basically a grid, which has a population of vectors.. who could have 

import { timingSafeEqual } from "crypto";

// for purposes of this code. A Vector is a carrier of a virus, not a data structure
class Region {
    people: Map<number,VirusVector>;
    width: number
    height: number
    scale: number
    population: number
    days: number
    movements: number
    deaths: number
    infected:number
    recovered:number
    counter:number

    constructor(population: number, x: number, y: number, scale: number) {
        console.log("constructing population.. " + x + "," + y + "scale:" + scale)
        this.scale = scale;
        this.population = population
        this.width = Math.floor(x/scale);
        this.height = Math.floor(y/scale);
        this.people = new Map<number,VirusVector>()
        this.createVectors()
        this.days=0
        this.deaths = 0
        this.counter = 0
        this.movements = 0 // 12 to a day. 
        this.infected = 0
        this.recovered = 0
        
    }
    xyToIndex(x: number, y: number) {
        return y * this.width + x
    }
    indexToXY(i: number) {
        return {x: i%this.width, y: Math.floor(i/this.width)}
    }

    createVectors2() {
        let v1 = new VirusVector(50,50,this.width, this.height)
        v1.infectedDays = 2
        let n = []
        let h = v1.hash()
        this.people.set(h,v1)
        this.logVector("first one..   :",v1)
        for (let x = 1; x < 5; x++) {
            let p = this.indexToXY(x*this.width+h)
            let nv = new VirusVector(p.x, p.y, this.width, this.height)
            this.logVector("   other ones.:", nv)
            this.people.set(h+x, nv)
        }
    }
    logVector(t:string, v:VirusVector) {
        console.log(t+" V - (x,y) - ("+v.x+","+v.y+")")
    }
    createVectors() {
        for (let p=0;p<this.population;p++) {
            let x = Math.floor(Math.random() * this.width)
            let y = Math.floor(Math.random() * this.height)
            let vv = new VirusVector(x,y,this.width, this.height)
            let h = vv.hash()
            // if random position is taken, just scoot along in linear fashion to find a spot. 
            if (this.people.has(h)) {
                let nxt = h
                while(this.people.has(nxt)) {
                    nxt = nxt+1%(this.width*this.height)
                }
                let n = this.indexToXY(nxt)
                vv = new VirusVector(n.x,n.y,this.width, this.height)
                h = nxt
             }
             if (p==0) {
                vv.infectedDays = 1
             }   
            this.people.set(h,vv)
        }
    }
    // first spreads infection to anyone in proximity if infectedDays bigger than 1 day.
    // kills people (vectors) according the accepted probability/death rate. 
    // incremements the infected days
    // recovers people after a set no. days. 
    // moves all people if they can move in the direction they are going
    // their direction changes by drunken sailor rules.
    //  
    advanceDay2() {
        return
    }
    movePeople() {
        this.movements++
        if (this.movements > 11) {
            this.movements = 0
            this.days++
        }
        let moved = 0
        let couldntMove = 0
        var nextGen = new Map<number,VirusVector>()
        
        for (let v of this.people.values()) {
            // after 1 infected day we can infect others
            if (v.infectedDays > 1) {
                // get neighbours and infect 3 of them.
                let spread = 0
                for (let x = -1; x < 2; x ++) {
                    for (let y = -1; y < 3; y++) {
                        if ((x!=0 || y!=0) && spread < 3) {
                            let h = this.xyToIndex((x+v.x+v.width)%v.width, (y+v.y+v.height)%v.height)
                            if (this.people.has(h)) {
                                spread++
                                let neighb = this.people.get(h)
                                if (neighb.infectedDays < 1 && !neighb.recovered) {
                                    neighb.infectedDays = 1
                                    this.infected++
                                }
                            }
                        }
                    }
                }
                // chance of dying every day adds up to about 1.4% chance. 
                if (Math.random() < 0.000664) {
                    v.died = false  // true.. just debugging
                    this.deaths++
                    //console.log("aaaaaaaarrrrrgggghhh - " + this.deaths)
                }
            }
            // if we are infected, increment the days
            // if we make it to 20.. we recover
            if (!v.died && v.infectedDays>0) {
                if( v.infectedDays < 80) {
                    v.infectedDays++
                } else {
                    v.infectedDays = 0
                    v.recovered = true
                    this.infected--
                    this.recovered++
                }
            }
           
            // now move in the "drunken" direction if can and if not dead
            // we check our current map and the new one, we don't want to clobber
            // any people in the next gen. 
            couldntMove++
            let nm = v.getNextMove()
            if (!v.died
                && !this.people.has(this.xyToIndex(nm.x, nm.y))
                && !nextGen.has(this.xyToIndex(nm.x, nm.y))) {
                //this.logVector("before", v)
                v.executeMove()
                //this.logVector("after", v)
                moved++
                couldntMove--
            }
            nextGen.set(v.hash(),v)
            //console.log("nextGen size is " + nextGen.size)
        }
        this.people = nextGen
        this.counter++
        if (this.counter > 25) {
            this.counter = 0
        }
    }

    drawGridOnCanvasContext(ctxt: CanvasRenderingContext2D) {
        ctxt.fillStyle = "#000000"
        let color = ''
        for(let v of this.people.values()) {
            color = '#0000ff' // blue
            if (v.infectedDays > 0) color = '#ff0000' // red
            if (v.recovered) color = '#22AA22' // green
            if (v.died) color = '#222222' //black/gray
            ctxt.fillStyle = color;
            if (v.oldX != v.x || v.oldY != v.y) {
                ctxt.clearRect(v.oldX*this.scale,v.oldY*this.scale,this.scale,this.scale)
            }
            ctxt.fillRect(v.x*this.scale, v.y*this.scale,this.scale, this.scale);
            //console.log("x and y are "+v.x+","+v.y)
        }
        // dashboard
        var dashX = this.width*.9*this.scale
        var dashY = this.width*.1*this.scale
        var border = 1
        var text = ["Population:" + this.population,
                    "Days:" + this.days, 
                    "Infected: "+ this.infected,
                    "Deaths:"+this.deaths,
                    "Recovered:" + this.recovered]
        var textW = 50
        var textH = 10
        
        let longestText = 0
        for (let t of text) {
            if (t.length > longestText) 
                longestText = t.length
        }
        ctxt.font = ""+this.scale*3+"px Verdana";
        ctxt.fillStyle = "#FFFFFF"
        ctxt.fillRect(dashX-border,dashY-border-(this.scale*3),longestText*2*this.scale, textH*2*text.length)
        ctxt.fillStyle = "#000000"
        for (let pos=0; pos< text.length; pos++) {
            ctxt.fillText(text[pos], dashX, dashY+textH*2*pos)
        }
    }


    dumpGrid() {

    }
    testIdxConversion() {

    }
     

}

/// keeps going in the same direction with a low probability of changing (drunken walk)
class VirusVector {

    // infected randomly by proximity (neighbouring cell) with infection probability defined by 
    // WHO reports.  
    DRUNKNESS = 0.05 
    infectedDays: number
    // prevents re-infection. 
    recovered: boolean
    // keeps ticking over to average recovery rate. If death doesn't happen, recovery does. 
    died: boolean// dies with set probability if infected
    // need these to calculate next size of grid
    width: number
    height: number
    x: number
    y: number
    oldX: number
    oldY: number
    direction: {x:number, y:number}
    constructor(x:number, y:number, width:number, height:number) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.recovered = false
        this.infectedDays = 0
        this.died = false
        this.direction = {x:0, y:0}
        this.direction.x = Math.floor(Math.random() * 3)-1
        this.direction.y = Math.floor(Math.random() * 3)-1
    }

   /// gets an x and y coord e.g. using the direction + width of grid. 
   // (0,-1) or (1,1) allows to test if there is something else at that point. 

    getNextMove() {
        let xd = (this.x + this.direction.x + this.width)%this.width
        let yd = (this.y + this.direction.y+this.height)%this.height
        this.changeDirection()
        return {x:xd, y:yd}
    }
    // actually makes the move
    executeMove() {
        let mv = this.getNextMove()
        //console.log("Next move is " + mv.x +","+mv.y)
        this.oldX = this.x
        this.oldY = this.y
        this.x = mv.x
        this.y = mv.y
   }
    // change direction randomly according to random walk rules. 
    private changeDirection() {
        if (Math.random() > this.DRUNKNESS)
            return
        this.direction.x = 0; this.direction.y = 0
        // might both be zero
        this.direction.x = Math.floor(Math.random() * 3)-1
        this.direction.y = Math.floor(Math.random() * 3)-1
    }
    //use the hash to store in a set for quicker calculation.
    hash() {
        return this.y*this.width + this.x
    } 
}


// abstraction of our canvas element. 
class Canvas {
    private canvas: HTMLCanvasElement;

    private context: CanvasRenderingContext2D;
    private paint: boolean;
    private region: Region;
    private checkDays: number 
    private x: number;
    private scale: number;
    private delay: number = 500;
    private timeStamp: number = 0;
    private populationSize: number

    constructor() {
        console.log("Constructing..")
        this.x = 0
        this.populationSize = 1500
        this.checkDays = -1
        this.canvas = document.getElementById('canvas') as
                 HTMLCanvasElement;
        console.log(`canvas =${this.canvas}`)
        this.context = this.canvas.getContext("2d");
        console.log(`context = ${this.context}`)
        this.context.lineWidth = 1;
        this.scale = 5;
    }
    private watchdog() {
        // annoyingly we need this because the "requestAnimationFrame" method fails from
        //time to time. 
        if (this.region.days >= this.checkDays) {
            this.checkDays ++
            return
        }
        //console.log("Woof!! Woof!! Wooof!!!  RRRRRRRRR....")
        this.checkDays = this.region.days -1
        this.redraw()
    }
    start() {
        console.log("Starting..")
        this.region = new Region(this.populationSize, this.canvas.width, this.canvas.height, this.scale)
        this.redraw()
        setInterval(this.watchdog.bind(this), this.delay);
    }

    private redraw() {
        //console.log("redraw..")
        let now = Date.now();
        if (now-this.timeStamp > this.delay) {
            this.timeStamp = now;
            this.region.drawGridOnCanvasContext(this.context);
            this.region.movePeople();
        }
        window.requestAnimationFrame(this.redraw.bind(this));
    }
    
}
new Canvas().start();
//new Canvas().test();

