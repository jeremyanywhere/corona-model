//k2N4/3N4/1P1N4/1P1N4/1P1N4/1P1N4/1P1N4/7K w - - 0 1
/// basically a grid, which has a population of vectors.. who could have 

//import { timingSafeEqual } from "crypto";

// for purposes of this code. A Vector is a carrier of a virus, not a data structure
class Params {
    public population: number
    public movement:number
    public preventClumping:boolean
    public mortalityRate: number
    public contagionRate: number
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
    recovered:number
    counter:number
    params:Params
    scale:number

    constructor(width: number, height: number, scale: number) {
        console.log("constructing population.. " +width + "," + height + "scale:" +scale)
        this.scale = scale
        this.width = Math.floor(width/scale);
        this.height = Math.floor(height/scale);
        this.people = new Map<number,VirusVector>()
        this.createVectors()
        this.days=0
        this.deaths = 0
        this.counter = 0
        this.movements = 0 // 12 to a day. 
        this.infected = 0
        this.recovered = 0

        console.log("population movement with "+ params.movement)
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
            // after 1 infected day we can infect others
            // TODO an infect neighbours method which uses a parameter for infection rate. 
            if (v.infectedDays > 1) {
                // get neighbours and infect n of them.
                this.infectNeighbours(v)
                if(this.movements%12==0) {
                    v.infectedDays++
                }
            }
            // if we are infected, increment the days
            // if we make it to 25 days.. we recover
            if(v.infectedDays > v.durationOfDisease) {
                v.infectedDays = 0
                v.infected = false
                if(v.willDie) {
                    v.died = true
                } else {
                    v.recovered = true
                    this.infected--
                    this.recovered++
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
                    } else if (Math.random()<0.25) {
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
                        }
                    }
                }
            }
        }
    }

    drawGridOnCanvasContext(ctxt: CanvasRenderingContext2D) {
        let tote = 0
        ctxt.fillStyle = "#00ffff"
        let color = "#00ffff"
        for(let v of this.people.values()) {
            color = '#0000ff' // blue
            if (v.infectedDays > 0) color = "#ff0000" // red
            if (v.recovered) color = "#22AA22" // green
            if (v.died) color = "#9933FF" 
            ctxt.fillStyle = color
            if (v.oldX != v.x || v.oldY != v.y) {
                ctxt.clearRect(v.oldX*this.scale,v.oldY*this.scale,this.scale,this.scale)
            }
            ctxt.fillRect(v.x*this.scale, v.y*this.scale,this.scale, this.scale)
            //console.log("x and y are "+v.x+","+v.y)
        }
        this.testIdxConversion()
        // dashboard
        
        var border = 2
        var text = ["Population:" + params.population,
                    "Days:" + this.days, 
                    "Infected: "+ this.infected,
                    "Deaths:"+this.deaths,
                    "Recovered:" + this.recovered]
        
        var fontSize = 3*this.scale
        var textW = fontSize/3*2
        var textH = fontSize
        
        let longestText = 0
        for (let t of text) {
            if (t.length > longestText) 
                longestText = t.length
        }
        var dashX = (this.width*this.scale)-(longestText*textW) 
        var dashY = textH*3
        ctxt.font = ""+fontSize+"px Verdana";
        //ctxt.fillStyle = "#FFF111"
        ctxt.clearRect(dashX - border,dashY-border,longestText*textW, textH*text.length + 2*border)
        ctxt.fillStyle = "#000000"
        for (let pos=0; pos< text.length; pos++) {
            ctxt.fillText(text[pos], dashX, dashY+textH*(pos+1))
        }
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
        this.infected = false
        this.infectees = 0
        // turn a real no. into a random int with the same probabilistic outcome. 
        let n = params.contagionRate
        this.maxNeighboursCanInfect = Math.floor(n) + ((Math.random()<(n-Math.floor(n)))?1:0)
        this.willDie = Math.random()*100<params.mortalityRate
        // when we reach this duration, we either die or recover depending on willdie
        this.durationOfDisease = Math.floor( 7+Math.random()*14) 
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
        if (Math.round(Math.random()*10) < params.movement)
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
    SCALE = 5
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
    private movement: number
    private terminate: boolean
    private intervalWatchdog: any


    constructor() {
        console.log("Constructing..")
        this.x = 0
        this.populationSize = params.population
        this.checkDays = -1
        this.canvas = document.getElementById('canvas') as
                 HTMLCanvasElement;
        console.log(`canvas =${this.canvas}`)
        this.context = this.canvas.getContext("2d");
        console.log(`context = ${this.context}`)
        this.context.lineWidth = 1;
        this.scale = 5;
        this.movement = params.movement
    }
    private watchdog() {
        // annoyingly we need this because the "requestAnimationFrame" method fails from
        //time to time. 
        if(this.terminate) {
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
        if (this.region!= null) {
            this.terminate = true
        }
        this.context.clearRect(0,0,this.canvas.width, this.canvas.height)
    }
    start() {
        //must garbage collect the old one. 
        this.region = new Region(this.canvas.width, this.canvas.height, this.SCALE)
        this.redraw()
        this.intervalWatchdog = setInterval(this.watchdog.bind(this), this.delay);
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

//new Canvas().test();

