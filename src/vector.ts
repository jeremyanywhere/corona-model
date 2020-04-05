//k2N4/3N4/1P1N4/1P1N4/1P1N4/1P1N4/1P1N4/7K w - - 0 1
/// basically a grid, which has a population of vectors.. who could have 

//import { timingSafeEqual } from "crypto";

// for purposes of this code. A Vector is a carrier of a virus, not a data structure

function normalDist(range: number): number  {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return normalDist(range); // resample between 0 and 1
    return num * range * 2;
}
class Params {
    public population: number
    public movement:number
    public preventClumping:boolean
    public mortalityRate: number
    public contagionRate: number
    public reset: boolean
    public speed: number
    public simulationLength: number
    public avgTimeToDeath: number
    public avgTimeToRecovery: number
}
 let params = new Params()

class Region {
    people: Map<number,VirusVector>;
    width: number
    height: number
    days: number
    movements: number
    deaths: number
    infected:number
    currentInfected: number
    peak:number
    recovered:number
    counter:number
    params:Params
    scale:number

    constructor(width: number, height: number, scale: number) {
        console.log("constructing population.. " +width + "," + height + "scale:" +scale)
        this.scale = scale
        this.width = Math.floor(width);
        this.height = Math.floor(height);
        this.people = new Map<number,VirusVector>()
        this.createVectors()
        this.days=0
        this.deaths = 0
        this.counter = 0
        this.movements = 0 // 12 to a day. 
        this.infected = 0
        this.currentInfected = 0
        this.recovered = 0
        this.peak = 0
    }
    xyToIndex(x: number, y: number) {
        return y * this.width + x
    }
    indexToXY(i: number) {
        return {x: i%this.width, y: Math.floor(i/this.width)}
    }
    logVector(t:string, v:VirusVector) {
        console.log(t+" V - (x,y) - ("+v.x+","+v.y+")")
    }
    createVectors() {
        for (let p=0;p<params.population;p++) {
            let x = Math.floor(Math.random() * this.width)
            let y = Math.floor(Math.random() * this.height)
            let vv = new VirusVector("vv"+p, x,y,this.width, this.height)
            let h = vv.hash()
            // if random position is taken, just scoot along in linear fashion to find a spot. 
            if (this.people.has(h)) {
                let nxt = h
                while(this.people.has(nxt)) {
                    nxt = nxt+1%(this.width*this.height)
                }
                let n = this.indexToXY(nxt)
                //vv = new VirusVector(n.x,n.y,this.width, this.height) - is this necessary? why not change indices..
                vv.x = n.x; vv.y = n.y
                h = nxt
            }
            if (p==0) {
                vv.infectedDays = 1
                vv.infected = true
                this.infected++
                this.currentInfected++
            }   
            this.people.set(h,vv)
            //console.log("created VVector at "+ vv.x + "," + vv.y)
        }
        this.createSVGElements()
    }
    createSVGElements() {
        var svgi = document.getElementById('svgId')
        var circ 
        for (let v of this.people.values()) {
            circ = document.createElementNS("http://www.w3.org/2000/svg","circle");
            circ.id = v.id
            circ.setAttribute("cx", ""+v.x)
            circ.setAttribute("cy", ""+v.y)
            circ.setAttribute('r',"0.5")
            circ.setAttribute("style","fill:blue;stroke-width:0")
            svgi.appendChild(circ)
            v.svgElement = circ
        }
    }
    // first spreads infection to anyone in proximity if infectedDays bigger than 1 day.
    // kills people (vectors) according the accepted probability/death rate. 
    // incremements the infected days
    // recovers people after a set no. days. 
    // moves all people if they can move in the direction they are going
    // their direction changes by drunken sailor rules.
    //  
    movePeople() {
        this.movements++
        this.days = Math.floor(this.movements / 12)
        let spread = 1
        let moved = 0
        let couldntMove = 0
        var nextGen = new Map<number,VirusVector>()
        
        for (let v of this.people.values()) {
            if (v.died) {
                nextGen.set(v.hash(),v)
                continue
            }
            
            // if we are infected then we can infect others, and must count the days. 
            if (v.infected) {
                // after 1 infected day we can infect others
                if (v.infectedDays > 1) {
                    // get neighbours and infect n of them.
                    this.infectNeighbours(v)

                }
                if(this.movements%12==0) {
                    v.infectedDays++
                }
                // if we make it to our disease duration we recover or die
                if(v.infectedDays > v.durationOfDisease) {
                    v.infectedDays = 0
                    v.infected = false
                    if(v.willDie) {
                        v.died = true
                        this.deaths++
                    } else {
                        v.recovered = true
                        this.recovered++
                        this.currentInfected--
                    }

                }
            }   
           
            // now move in the "drunken" direction if can (and if not dead)
            // we check our current map and the new one, we don't want to clobber
            // any people in the next gen. 
            if (!v.died) {
                let nm = v.getNextMove()
                if(!this.people.has(this.xyToIndex(nm.x, nm.y))
                && !nextGen.has(this.xyToIndex(nm.x, nm.y))) {
                    v.executeMove()
                    // now give it the chance to change direction next time. 
                    v.randomWalk()
                    moved++
                } else {
                    // if we can't move and we don't force a direction change
                    // then we get "clumping". 
                    // we always reduce clumping by some factor. 
                    
                    if (params.preventClumping) {
                        v.changeDirection()
                    } else if (Math.random()<0.1) {
                        v.changeDirection()
                    }
                }
            }
            nextGen.set(v.hash(),v)
        }
        if (this.people.size != nextGen.size) {
            console.log("Man Overboard.. "+(this.people.size - nextGen.size) )
        }
        this.people = nextGen
        this.counter++
        if (this.counter > 25) {
            this.counter = 0
        }
    }
    infectNeighbours(v:VirusVector) {
        for (let x = -1; x < 2; x ++) {
            for (let y = -1; y < 3; y++) {
                if ((x!=0 || y!=0)) {
                    let h = this.xyToIndex((x+v.x+v.width)%v.width, (y+v.y+v.height)%v.height)
                    if (this.people.has(h)) {
                        let neighb = this.people.get(h)
                        if (!neighb.infected && !neighb.recovered && !neighb.died &&(v.infectees<v.maxNeighboursCanInfect)) {
                            //random 50% chance of affecting a particular neighbour, but only to the maximum
                            // as dictated by the infection rate
                            neighb.infected = true
                            neighb.infectedDays = 0
                            v.infectees++
                            this.infected++ 
                            this.currentInfected++
                            if (this.peak < this.currentInfected) {
                                this.peak = this.currentInfected
                            }
                        }
                    }
                }
            }
        }
    }
    renderGridInSVG(svg: HTMLElement) {
        var circ 
        var color
        //var vv: VirusVector
        //console.log("Children of DUNE (svg) "+svg.childElementCount)

        for(let v of this.people.values()) {
            //console.log("looking for circle in vector - "+v.id+ " "+ v.svgElement)
            circ = v.svgElement
            circ.setAttribute('cx',""+v.x)
            circ.setAttribute('cy',""+v.y) 
            color = "#2222FF" // blue
            if (v.infected) color = "#FF0000" // red
            //if (v.recovered) console.log("Oh yes.. I have Recovered!")
            if (v.recovered) color = "#22AA22" // green
            if (v.died) color = "#AA00AA" 
            circ.setAttribute("style",("fill:"+color+";stroke-width:0"))
        }
        this.drawBanner()

    }
    drawBanner() {
        document.getElementById("deathbanner").innerHTML = ("Deaths: "+this.deaths)
        document.getElementById("infectedbanner").innerHTML = ("Total Infected: "+this.infected)
        document.getElementById("recoveredbanner").innerHTML = ("Recovered: "+this.recovered)
        document.getElementById("populationbanner").innerHTML = ("Population: "+this.people.size)
        document.getElementById("daybanner").innerHTML = ("Days: "+this.days)
        document.getElementById("peakbanner").innerHTML = ("Peak Infection: "+ (Math.round((this.peak / this.people.size)*1000)/10)+"%")

    }
    testIdxConversion() {
        for(let k of this.people.keys()) {
            let v = this.people.get(k)
            if (k!=v.hash()) {
                console.log("oh dear, hash doesn't match .. " + k + " " + v.hash())
            }
        }
    }
     

}

/// keeps going in the same direction with a low probability of changing (drunken walk)
class VirusVector {
    id: string
    svgElement: SVGElement
    infected: boolean
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
    willDie:boolean
    direction: {x:number, y:number}
    maxNeighboursCanInfect: number 
    infectees: number
    durationOfDisease: number // we calculate up front to make life easier. 
    walkFactor: number // make social distancing / random walk parameters exponential
    constructor(id:string, x:number, y:number, width:number, height:number) {
        this.id = id
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
        this.infected = false
        this.infectees = 0
        
        let n = normalDist(params.contagionRate)
        // turn a real no. into a random int with the same probabilistic outcome. 
        this.maxNeighboursCanInfect = Math.floor(n) + ((Math.random()<(n-Math.floor(n)))?1:0)

        // when we reach this duration, we either die or recover depending on willdie
        this.willDie = (Math.random()*100 < params.mortalityRate)
        if (this.willDie) {
            // on average deaths will occur in shorter time frame than recovery. 
            this.durationOfDisease = normalDist(params.avgTimeToDeath)
        } else {
            this.durationOfDisease = normalDist(params.avgTimeToRecovery)
        }     
        
        this.walkFactor = 2**8
    }


   /// gets an x and y coord e.g. using the direction + width of grid. 
   // (0,-1) or (1,1) allows to test if there is something else at that point. 

    getNextMove() {
        let xd = (this.x + this.direction.x + this.width)%this.width
        let yd = (this.y + this.direction.y+this.height)%this.height
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
    // changes direction based on a random value. 
    randomWalk() {
        if (Math.random()*100 > params.movement) 
            return
        this.changeDirection()
    }
    // change the direction vector randomly 
    changeDirection() {
        this.direction.x = 0; this.direction.y = 0
        // might both be zero
        this.direction.x = Math.floor(Math.random() * 3)-1
        this.direction.y = Math.floor(Math.random() * 3)-1
        // for debugging purposes. Let's remove 0 directions.
        if (this.direction.x ==0 && this.direction.y == 0) {
            this.direction.x = 1
        }
    }
    //use the hash to store in a set for quicker calculation.
    hash() {
        return this.y*this.width + this.x
    } 
}


// abstraction of our canvas element. 
class Canvas {
    SCALE = 1
    private canvas: HTMLCanvasElement;
    private svg: HTMLElement
    private context: CanvasRenderingContext2D;
    private paint: boolean;
    private region: Region;
    private checkDays: number 
    private x: number;
    private scale: number;
    private timeStamp: number = 0;
    private populationSize: number
    private movement: number
    private intervalWatchdog: any


    constructor() {
        console.log("Constructing..")
        this.x = 0
        this.populationSize = params.population
        this.checkDays = -1
        //this.canvas = document.getElementById('canvas') as
        //         HTMLCanvasElement;
        this.svg = document.getElementById('svgId') as HTMLHtmlElement
        //console.log(`canvas =${this.canvas}`)
        //this.context = this.canvas.getContext("2d");
        //console.log(`context = ${this.context}`)
        //this.context.lineWidth = 1;
        this.scale = 1;
        this.movement = params.movement
    }
    private watchdog() {
        // annoyingly we need this because the "requestAnimationFrame" method fails from
        //time to time. 
        if(params.reset) {
            clearInterval(this.intervalWatchdog)
        }
        if (this.region.days >= this.checkDays) {
            this.checkDays ++
            return
        }
        //console.log("Woof!! Woof!! Wooof!!!  RRRRRRRRR....")
        this.checkDays = this.region.days -1
        this.redraw()
    }
    clear() {
        var svgi = document.getElementById('svgId')
        for(let v of this.region.people.values()) {
            svgi.removeChild(v.svgElement)
        }

    }
    start() {
        this.dumpParams()
        var viewbox = this.svg.getAttributeNS("http://www.w3.org/2000/svg",'viewbox') 
        console.log("viewbox x is "+viewbox)
        this.region = new Region(160, 120, this.SCALE)
        this.redraw()
        //this.intervalWatchdog = setInterval(this.watchdog.bind(this), params.speed);

    }
    startOLD() {
        //must garbage collect the old one. 
        this.dumpParams()
        
        this.region = new Region(this.canvas.clientWidth, this.canvas.clientHeight, this.SCALE)
        this.redraw()
        this.intervalWatchdog = setInterval(this.watchdog.bind(this), params.speed);
    }
    dumpParams() {
        console.log("Parameters are:") 
        console.log("   speed " + params.speed)
        console.log("   reset " + params.reset)
        console.log("   preventClumping " + params.preventClumping)
        console.log("   contagionRate " + params.contagionRate)
        console.log("   mortalityRate " + params.mortalityRate)
        console.log("   movement " + params.movement)
        console.log("   Length "+ params.simulationLength)
        console.log("   Time to Death" + params.avgTimeToDeath)
        console.log("   Time to Recovery"+params.avgTimeToRecovery)
    }
    private redraw() {
        //console.log("redraw..")
        let now = Date.now();
        if (now-this.timeStamp > params.speed) {
            this.timeStamp = now;
            this.region.renderGridInSVG(this.svg);
            if (this.region.days < params.simulationLength)
                this.region.movePeople();
        }
        if (!params.reset) {
            window.requestAnimationFrame(this.redraw.bind(this));
        } else {
            this.clear()
        }
    }
    
}

//new Canvas().test();

