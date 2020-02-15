var canvas;
var ctx;
var world:World;

//what size of an adult is a newborn baby? (e.g. 10% of adult size, then 0.1)
//at what age are animals fullgrown?

function draw2() {
    if (!world.Trails) ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let cell of world.Cells){
        cell.addEnergy(world.EnergyRate);
        drawCell(world, cell);
    }

    let deadHeap:Animal[] = [];
    for(let animal of world.Animals) {
        animal.takeTurn(world);
        animal.addAge(world.TickDuration);
        if (!animal.Alive && animal.DeadDuration >= animal.MaxDeadDuration ) {
            deadHeap.push(animal);
        } else {
            drawAnimal(world, animal);
        }
    }
    
    for (let deadIndex in deadHeap){
        let deady = deadHeap[deadIndex];
        let cell = world.getCell(deady.Col, deady.Row);
        cell.Animal = null;
        let index = world.Animals.indexOf(deady);
        world.Animals.splice(index,1);
        // and it's gone!
    }

    //restock
    //while (world.Animals.length < world.StartingPopSize) {
    //    world.tryAddAnimal();
    //}
    showStats();

    requestAnimationFrame(draw2);
}

class World {
    tryAddAnimal():boolean {
        //todo: move this chunk into 'tryAddAnimal()
        let col = rando(this.Columns);
        let row = rando(this.Rows);
        let age = rando(100);
        let initialEnergy = 100;
        return this.addAnimal(col, row, age, initialEnergy);
    }
    addAnimal(col:number, row:number, age:number, initialEnergy:number):boolean {
        let cell = this.getCell(col, row);
        if (cell.Animal == null) {
            var animal = new Animal(col, row,age, initialEnergy);
            this.Animals.push(animal);
            cell.Animal = animal;
            return true;
        } else {
            //console.log("ALREADY an animal there!");
            return false;
        }
    }
    constructor(
        columns:number,
        rows:number,
        canvasWidth:number,
        canvasHeight:number,
        startingPopSize:number
    ) {
        //TODO: calculate cell width/height
        this.Columns = columns;
        this.Rows = rows;
        this.CanvasWidth = canvasWidth;
        this.CanvasHeight = canvasHeight;
        this.Cells = [];
        this.StartingPopSize = startingPopSize;
        this.WidthOfCell = canvasWidth / columns;
        this.HeightOfCell = this.CanvasHeight / rows;
        for(let row=0; row < this.Rows; row++){
            for(let col=0; col< this.Columns; col++){
                let cell = new Cell(col, row);

                this.Cells.push(cell);
            }
        }
        console.log("For squarer cells, keep #rows and set cols to: " + ((canvasWidth / canvasHeight) * rows) );
        console.log("...or keep # cols and set rows to: " + ((canvasHeight/canvasWidth) * columns));
        this.Animals = [];
    
        while (this.Animals.length < this.StartingPopSize) {
            this.tryAddAnimal();
        }

    }
    StartingPopSize:number;
    WidthOfCell:number = 20;
    HeightOfCell:number = 20;
    Columns:number;
    Rows:number;
    CanvasWidth:number;
    CanvasHeight:number;
    Cells:Cell[];
    Animals:Animal[];
    Trails:boolean = false;
    EnergyRate:number = 0.1;
    TickDuration:number = 0.1;
    getCell(col:number, row:number):Cell {
        return this.Cells[col + (row*this.Columns)];
    }
    getNeighborCells(col:number, row:number):Cell[] {
        let result:Cell[] = [];
        for (let i:number = 0; i < 3; i++)
        {
            for (let j:number = 0; j < 3; j++)
            {
                let offsetX = i - 1;
                let offsetY = j - 1;
                let newX = col + offsetX;
                let newY = row + offsetY;
                if (newX < 0) newX = this.Columns - 1;
                if (newY < 0) newY = this.Rows - 1;
                if (newX >= this.Columns) newX = 0;
                if (newY >= this.Rows) newY = 0;
                if (offsetX != 0 || offsetY != 0) // ignore current tile...
                {
                    //console.log(`newX, newY: ${newX}, ${newY} -- is cell number... ${newX + (newY*this.Columns)}`)
                    var cell = this.getCell(newX, newY);//this.Cells[newX + (newY*this.Columns)];
                    if (cell.Col == newX && cell.Row == newY) {
                        //console.log("As expected...");
                    } else {
                        //console.log(`Expected: col,row: ${newX}, ${newY}, found: ${cell.Col},${cell.Row}`);
                    }
                    result.push(cell);
                }
            }
        }
        return shuffle(result);
    }
}

//a single population? multiple pops??
class Population {

}

class Cell {
    constructor(col:number, row:number){
        this.Col = col;
        this.Row = row;
        this.Energy = rando(100);
    }
    color():string {
//ctx.fillStyle = '#FFA500';
//ctx.fillStyle = 'rgb(255, 165, 0)';
        return `rgba(0, ${Math.floor(this.Energy * 2.55)}, 0, 0.7)`;
    }
    Col:number;
    Row:number;
    Energy:number;
    Animal:Animal;
    addEnergy(amount:number):number {

        let initialEnergy = this.Energy;
        //cannot be less than zero, cannot be greater than 100.
        this.Energy = Math.max(0, Math.min(100, this.Energy+amount));
        return (this.Energy - initialEnergy); //how much difference did it make;
        //return this.Energy - amount;
    }
}
function drawCell(world:World, cell:Cell) {
    //TODO: color of cell!
    //ctx.fillStyle = 'orange';

    ctx.fillStyle = cell.color();
	ctx.beginPath();
    ctx.fillRect(
        world.WidthOfCell * cell.Col, 
        world.HeightOfCell * cell.Row, 
        world.WidthOfCell,
        world.HeightOfCell);
    ctx.stroke();
}
class Animal {
    takeTurn(world: World) {
        if (!this.Alive) return;
        let currentTile = world.getCell(this.Col, this.Row);
        let neighbors = world.getNeighborCells(this.Col, this.Row);
        let bestNeighbor = currentTile;
        for(var t of neighbors){
            if (t.Animal == null && t.Energy > bestNeighbor.Energy){
                bestNeighbor = t;
            } 
        }

        //TODO: Only move to bestNeighbor if:
        // bestNeighbor.Energy > this.Genes[hg.WorthMovingTo.ToString()]))
        // AND deduct "moving" energy... 
        // (if/when i have altitude -- the energy of moving will be based on altitude as well.)
        currentTile.Animal = null;
        bestNeighbor.Animal = this;
        this.Col = bestNeighbor.Col;
        this.Row = bestNeighbor.Row;
        let movingEnergy = 7;
        this.Energy -= movingEnergy;
        //todo: standing still takes energy too.
        if (this.Energy <= 0){
            console.log("Died of exhaustion.");
            this.Alive = false;
            return;
        } else {
            //console.log("Moved");
        }

        //eat some energy...
        let munchAmount = this.Genes[gene.MunchAmount];
        munchAmount = -1 * bestNeighbor.addEnergy(-1 * munchAmount);
        //console.log(`munch amount: ${munchAmount}`);
        this.Energy += munchAmount;

        this.considerMating(neighbors);
    }

    considerMating(cells:Cell[]) {
        if (this.Age < this.Genes[gene.AgeOfMaturity]) return;
        
        if (this.Energy < this.Genes[gene.MinMatingEnergy]) return;
        if (this.Energy < this.Genes[gene.EnergyToChild]) return;
        //if their mating percent is 10%... then 90% of the time they'll exit here.
        
        if (this.Genes[gene.MatingPercent] <= rando(100)) return;
        //this means that 10% of the time, they are willing to consider mating.
        // whether or not they run into anyone... that's a different issue.
        
        let neighbors:Animal[] = [];
        let emptyCells:Cell[] = [];
        for(let cell of cells){
            if (cell.Animal != null) {
                // criteria to be a suitable mate:
                if (cell.Animal.Age > cell.Animal.Genes[gene.AgeOfMaturity]
                    && cell.Animal.AdvertisedEnergy() > this.Genes[gene.MinimumAcceptableEnergyInaMate]) {
                    neighbors.push(cell.Animal);
                }
            } else {
                emptyCells.push(cell);
            }
        }

        if (neighbors.length == 0 || neighbors.length >= 8) return;

        //there were no mating opportunities anyway.
        //TODO: only consider mating if the area is not overcrowded.
        //TODO: only consider mating if you have enough energy
        //TODO: rank the suitors by most energy.
        //TODO: suitors have their energy, but also: how much energy they advertise.
        
        let potentialMate = neighbors[0];
        //TODO: perform cross over of genes;

        world.addAnimal(emptyCells[0].Col, emptyCells[0].Row, 0, this.Genes[gene.EnergyToChild]);
        let child = world.getCell(emptyCells[0].Col, emptyCells[0].Row).Animal;
        child.Genes = Crossover(this.Genes, potentialMate.Genes);
        //child.Energy = this.EnergyToChild;
        this.Energy -= this.Genes[gene.EnergyToChild];
    }
    AdvertisedEnergy() {
        //todo: consider displaying a different amount of energy.
        //but note that it might take energy to lie about your amount of energy.
        return this.Energy;
    }

    addAge(tickDuration: number) {
        this.Age = Math.min(this.MaxAge, this.Age+tickDuration);
        this.Size = this.Age / this.MaxAge;
        if (this.Age >= this.MaxAge) {
            this.Alive = false;
            console.log("Died of old age.");
        }
        if (!this.Alive) {
            this.DeadDuration = Math.min(this.MaxDeadDuration, this.DeadDuration+tickDuration);
        }
    }
    constructor(col:number, row:number, age:number, initialEnergy:number) {
        this.Col = col;
        this.Row = row;
        this.Age = age;
        this.Size = 1; //baby size
        this.Energy = initialEnergy; 
        this.Id = newId();
        this.Genes = {
            [gene.MatingPercent]: 3, // what percent of the time are you thinking about mating
            [gene.MinMatingEnergy]: 70, //if less than this much energy, don't consider mating
            [gene.EnergyToChild]:20, // how much energy does a child start with
            [gene.MunchAmount]:25, //how much energy will they try to extract from the ground each chance they get
            [gene.AgeOfMaturity]:10, //how old do they have to be before they can mate
            [gene.MinimumAcceptableEnergyInaMate]:1 //a pulse will do
        };
        
    }
    color():string {
        if (!this.Alive) {
            let fade = Math.max(0, 1 - (this.DeadDuration / this.MaxDeadDuration));
            let color = `rgba(20,20,20, ${fade})`;
            //console.log(color);
            return color;
        }
        return 'rgba(12,100,200, 0.9)';
    }
    Col:number;
    Row:number;
    Size:number;
    Age:number; //when age = maxage... they die.
    MaxAge:number = 100;
    Alive:boolean = true;
    DeadDuration:number = 0; //if dead... how long have they been dead?
    MaxDeadDuration:number = 5; //how long does the body take to decompose
    Energy:number = 100;
    Id:number;
    Genes: EnumDictionary<gene, number>;
    
    //Genes: {[id: gene]: number};
}

function drawAnimal(world:World, animal:Animal) {
    ctx.fillStyle = animal.color();
    ctx.beginPath();
    ctx.strokeStyle = animal.color();
    ctx.lineWidth = 1;
    ctx.arc(world.WidthOfCell * animal.Col + (world.WidthOfCell/2),
        world.HeightOfCell * animal.Row + (world.HeightOfCell/2),
        animal.Size * (Math.min(world.WidthOfCell, world.HeightOfCell)/2), 0, 2 * Math.PI);
    ctx.closePath();
	ctx.fill();
    ctx.stroke();
}

function start2(randomize:boolean, worldWidth:number, worldHeight:number){
    world = new World(84, 40, worldWidth, worldHeight, 30);
}

function showStats() {
    let pop = world.Animals.length;
    //todo: average energy
    //todo: average of each gene.
    //todo: ability to expand/collapse the stats.
    $id('stats').innerHTML = `pop: ${pop}`;   
}
/* utility functions */
let id = 0;
function newId():number {
  return ++id;
}
function rando(max:number) {
  return Math.floor(Math.random() * max);
}
/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a:any[]) {
    let j:number, x:any;
    for (let i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}
function $(selector: string): HTMLElement[] {
    return <any>document.querySelectorAll(selector);
}

function $id(id: string): HTMLElement {
    return document.getElementById(id);
}
  
/* end utility */

/* gene types */

function Crossover(parent1Genes:EnumDictionary<gene, number>, parent2Genes:EnumDictionary<gene, number>):EnumDictionary<gene, number> {
    //todo: return genes;
    let newGenes = {
        [gene.MatingPercent]: CombineGene(parent1Genes[gene.MatingPercent],parent2Genes[gene.MatingPercent]),
        [gene.MinMatingEnergy]: CombineGene(parent1Genes[gene.MinMatingEnergy],parent2Genes[gene.MinMatingEnergy]),
        [gene.EnergyToChild]: CombineGene(parent1Genes[gene.EnergyToChild],parent2Genes[gene.EnergyToChild]),
        [gene.MunchAmount]: CombineGene(parent1Genes[gene.MunchAmount],parent2Genes[gene.MunchAmount]),
        [gene.AgeOfMaturity]: CombineGene(parent1Genes[gene.AgeOfMaturity],parent2Genes[gene.AgeOfMaturity]),
        [gene.MinimumAcceptableEnergyInaMate]: CombineGene(parent1Genes[gene.MinimumAcceptableEnergyInaMate],parent2Genes[gene.MinimumAcceptableEnergyInaMate]),        
    };
    return newGenes;
}
function CombineGene(gene1:number, gene2:number):number {
    
    let result = gene1;
    let coin = rando(100);
    if (coin<50) result = gene2;
    let mutate = Math.min(rando(100),rando(100));
    coin = rando(100);
    if (coin<50) mutate *= -1;
    mutate = mutate/100;
    result += mutate;
    if (result > 100) result = 100;
    if (result < 0) result = 0;
    return result;
}

type EnumDictionary<T extends string | symbol | number, U> = {
    [K in T]: U;
};

enum gene {
    MatingPercent = 1, // what percent of the time are you thinking about mating
    MinMatingEnergy, //if less than this much energy, don't consider mating
    EnergyToChild, // how much energy does a child start with.
    MunchAmount, //how much energy will they try to extract from the ground each chance they get
    AgeOfMaturity, //how old do they have to be before they can mate
    MinimumAcceptableEnergyInaMate, //a pulse will do
};
/* end gene types */

document.addEventListener("DOMContentLoaded", function () {
	canvas = document.getElementById("html-canvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
    ctx = canvas.getContext("2d");
    canvas.addEventListener('click', function() { 
        world.getNeighborCells(5,5);
    }, false);
	start2(true, canvas.width, canvas.height);
	draw2();
}, false);