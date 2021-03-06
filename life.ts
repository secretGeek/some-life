var canvas:HTMLCanvasElement;
var ctx:CanvasRenderingContext2D;
var world:World;
var causeOfDeathNatural:boolean[] = [];

var deathsToTrack:number = 100; //number of recent deaths to keep track of for stats reasons.

// what is the display size of a baby (relative to an adult) (e.g. 10% of adult size, then 0.1)

//Feature to consider:
// walls
//predation
// has a level ... and the chances of 

function draw2() {
    if (!world.Trails) ctx.clearRect(0, 0, canvas.width, canvas.height);
    world.Tick++;
    world.SeasonDay++;

    if (world.SeasonDay >= world.SeasonLength) {
        world.ItIsSummer = !world.ItIsSummer;

        //this causes a strange seasonal change I find intriguing...
        if (world.Settings.DoSeasonsGetLonger) world.SeasonLength++;
        //in case the setting has been altered to a non-integer value... round it now.
        if (world.Settings.MaxSeasonLength > 0 ) world.Settings.MaxSeasonLength = Math.floor(world.Settings.MaxSeasonLength);
        if (world.Settings.MaxSeasonLength > 0 ) world.SeasonLength = Math.min(world.Settings.MaxSeasonLength, world.SeasonLength);

        world.SeasonDay = 0;
    }

    for(let cell of world.Cells){
        if (world.Settings.IsAlwaysSummer || world.ItIsSummer) cell.addEnergy(world.Settings.EnergyRate,"flow");
        drawCell(world, cell);
    }
    
    let deadHeap:Animal[] = [];
    for(let animal of world.Animals) {
        animal.takeTurn(world);
        animal.addAge(world.Settings.TickDuration);
        if (!animal.Alive && animal.DeadDuration >= world.Settings.MaxDeadDuration) {
            deadHeap.push(animal);
        } else {
            drawAnimal(world, animal);
        }
    }
    
    for (let deady of deadHeap){
        //let deady = deadHeap[deadIndex];
        let cell = world.getCell(deady.Col, deady.Row);
        cell.Animal = null;
        let index = world.Animals.indexOf(deady);
        world.Animals.splice(index,1);
        // poof! and it's gone!
    }
    
    if (world.Pop != 0 && !paused) {
        showStats();
        if (world.Settings.Delay==0){
            requestAnimationFrame(draw2);
        } else {
            setTimeout(function(){ requestAnimationFrame(draw2); }, world.Settings.Delay);
        }
    }
}

class Wall {
    constructor(height:number) {
        this.Height = height;
    }
    Height: number;
}
class World {
    InjectWall(col: number, row: number) {
        var c = this.getCell(col, row);
        c.Wall = new Wall(10);
        if (c.Animal) {
            if (c.Animal.Alive) {
                c.Animal.Alive = false;
                c.Animal.NaturalCauses = false;
                c.Animal.Log("Dropped wall on head", c.Wall.Height);
                // Hardly natural causes when you get a wall dropped on your head is it.
            }
        }
    }
    getCellAtXY(x: number, y: number):Cell {
        let column = Math.floor(x / this.WidthOfCell);
        let row = Math.floor(y/this.HeightOfCell);
        var c = this.getCell(column, row);
        return c;
    }
    constructor(
        canvasWidth:number,
        canvasHeight:number,
    ) {
        this.CanvasWidth = canvasWidth;
        this.CanvasHeight = canvasHeight;
    }
    initialize() {
        this.Cells = [];
        this.Columns = Math.floor(this.Settings.InitialColumns);
        this.Rows = Math.floor(this.Settings.InitialRows);
        this.WidthOfCell = this.CanvasWidth / this.Columns;
        this.HeightOfCell = this.CanvasHeight / this.Rows;
        for(let row=0; row < this.Rows; row++){
            for(let col=0; col< this.Columns; col++){
                let cell = new Cell(col, row);
                this.Cells.push(cell);
            }
        }
        console.log("For squarer cells, keep #rows and set cols to: " + ((this.CanvasWidth / this.CanvasHeight) * this.Rows) );
        console.log("...or keep # cols and set rows to: " + ((this.CanvasHeight/this.CanvasWidth) * this.Columns));

        if (this.Settings.DrawBoxWalls) {
            // Draw a grid!

            for(let x = 0; x < this.Columns / this.Settings.BoxWallSize; x ++ ){
                for(let y = 0; y < this.Rows; y++) {
                    this.InjectWall(x*this.Settings.BoxWallSize,y);
                }
            }

            for(let y = 0; y < this.Rows / this.Settings.BoxWallSize; y++) {
                for(let x = 0; x < this.Columns; x ++ ){
                    this.InjectWall(x,y*this.Settings.BoxWallSize);
                }
            }

        } else if (this.Settings.DrawCorridor) {

            // Draw a series of walls that create one long winding corridor

            // outer square
            for(let x = 0; x < this.Columns; x ++ ){
                this.InjectWall(x, 0);
                //this.InjectWall(x, this.Rows-1);
            }

            for(let y = 0; y < this.Rows; y ++ ){
                this.InjectWall(0, y);
                //this.InjectWall(this.Columns - 1, y);
            }

            for(let x = 1; x < this.Columns/2; x ++ ){
                for(let y = (x%2)+1; y < this.Rows - ( (x+1) % 2  ); y ++ ){
                    this.InjectWall(x*2, y);
                }
            }
            
        }

        this.SeasonLength = Math.floor(this.Settings.InitialSeasonLength);    
        if (this.Settings.InitialPopulationSize > this.Columns * this.Rows){
            console.log("Too many animals to fit into a world of this size. Reducing initial pop size");
            this.Settings.InitialPopulationSize = (this.Columns * this.Rows ) ;
        }

        this.Animals = [];
        while (this.Animals.length < this.Settings.InitialPopulationSize) {
            this.tryAddAnimal();
        }
        console.log(this);
    }

    Pop: number = -1;
    Settings:Settings = new Settings();
    ItIsSummer:boolean = true; //starts true, may or may not ever change, depending on settings.
    SeasonDay:number = 0; //today is the nth day of the current season.
    SeasonLength: number;
    Tick:number = 0;
    WidthOfCell:number;
    HeightOfCell:number;
    CanvasWidth:number;
    CanvasHeight:number;
    Cells:Cell[];
    Columns:number;
    Rows:number;
    Animals:Animal[];
    Trails:boolean = false;
    
    tryAddAnimal():boolean {
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
            return false;
        }
    }
    
    getCell(col:number, row:number):Cell {
        return this.Cells[col + (row*this.Columns)];
    }

    // get the 8 cells that surround this cell and return them in random order.
    getNeighborCells(col:number, row:number):Cell[] {
        let result:Cell[] = [];
        //TODO: a neighborhood could be a larger area, consider 3x3, 5x5, 7x7... 
        for (let i:number = 0; i < 3; i++)
        {
            for (let j:number = 0; j < 3; j++)
            {
                let offsetX = i - 1; //minus (side-1)/2, e.g. side defaults to 3, but could 5,7,9
                let offsetY = j - 1; //minus (side-1)/2
                let newX = col + offsetX;
                let newY = row + offsetY;
                if (newX < 0) newX = this.Columns + newX; //wrap...
                if (newY < 0) newY = this.Rows + newY; //...around!
                if (newX >= this.Columns) newX = this.Columns - newX;
                if (newY >= this.Rows) newY = this.Rows - newY;
                if (offsetX != 0 || offsetY != 0) // ignore current tile...
                {
                    var cell = this.getCell(newX, newY);
                    result.push(cell);
                }
            }
        }
        return shuffle(result);
    }
}

class Cell {
    constructor(col:number, row:number){
        this.Col = col;
        this.Row = row;
        this.Energy = rando(100);
    }
    color():string {
        if (this.Wall) {
            return `rgb(120,110,110)`;    
        }
        return `hsla(120, 69%, ${Math.floor((this.Energy*0.4)+5)}%, 0.9)`;
    }
    Col:number;
    Row:number;
    Energy:number;
    Animal:Animal;
    Wall: Wall;
    log:string[] = [];
    Log(event:string, amount:number){
        if (!world.Settings.VerboseLog) return;
        this.log.push(`${event}: ${amount}`);
    }
    addEnergy(amount:number, reason:string):number {
        let initialEnergy = this.Energy;
        //cannot be less than zero, cannot be greater than 100.
        this.Energy = Math.max(0, Math.min(100, this.Energy+amount));
        this.Log(reason, amount);
        return (this.Energy - initialEnergy); //how much difference did it make;
    }
}

function drawCell(world:World, cell:Cell) {
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
            if (!t.Animal && !t.Wall && t.Energy > bestNeighbor.Energy){
                bestNeighbor = t;
            } 
        }

        //TODO: could have some strategy for when it's worth moving.
        // could also have some strategy for moving even when it's not worth moving.
        // (if/when i have altitude -- the energy of moving will be based on altitude as well.)
        
        // energy taken to move depends on our current "mass" which is our stored energy.
        let movingEnergy = this.calcMovingEnergy();
        let weMoved = false;
        let standingStillEnergy = world.Settings.StandingStillEnergy;

        if (bestNeighbor == currentTile 
            || bestNeighbor.Energy > movingEnergy) {

            if (bestNeighbor != currentTile) {
                // gonna move!
                weMoved = true;
                this.moveTo(currentTile, bestNeighbor, movingEnergy);
                currentTile = bestNeighbor;
            } else {
                // didn't move, but standing still takes energy.
                this.incEnergy(standingStillEnergy * -1,"standing still")
            }
            
            //woah, moving or standing still... it wiped us out!

            if (!this.Alive) return;

            //eat some energy...
            let munchAmount = this.Genes.MunchAmount;
            if (this.Energy + munchAmount > (this.Genes.MaxEnergy*world.Settings.EnergyUpscaleFactor)){
                // don't try to eat more than you can store!
                munchAmount = (this.Genes.MaxEnergy*world.Settings.EnergyUpscaleFactor) - this.Energy;
            }

            //and you can't eat more than the cell can give you!
            munchAmount = -1 * bestNeighbor.addEnergy(-1 * munchAmount, "munched");

            //console.log(`munch amount: ${munchAmount}`);
            //this.Energy += munchAmount;
            this.incEnergy(munchAmount,"ate grass");

            if (this.Energy > (this.Genes.MaxEnergy*world.Settings.EnergyUpscaleFactor)) {
                console.log(`I have more energy than I thought possible! munched:${munchAmount} new_energy:${this.Energy} max:${this.Genes.MaxEnergy}`);
            }
        } else {
            //standing still...
            //how much does that cost?
            
            this.incEnergy(standingStillEnergy * -1, "standing still")

            if (!this.Alive) return;
        }
        let weFought = false;

        
        if (!weMoved) {
            //consider violence.
            if (world.Settings.ConsiderViolence) this.considerViolence(currentTile, neighbors);
        }
        
        if (!this.Alive) return;

        neighbors = world.getNeighborCells(this.Col, this.Row);

        if (this.Age >= this.Genes.AgeOfMaturity) {
            this.considerMating(neighbors);
        }
    }

    moveTo(currentTile:Cell, bestNeighbor:Cell, movingEnergy:number) {
        currentTile.Animal = null;
        bestNeighbor.Animal = this;
        this.Col = bestNeighbor.Col;
        this.Row = bestNeighbor.Row;
        this.incEnergy(movingEnergy * -1, `moved with energy ${this.Energy}`);
    }

    calcMovingEnergy() {
        //The amount of energy it takes to move depends on how much energy we have, 
        // which is considered analgous to our mass.
        return (this.Energy / 40) + 3;
    }
    
    considerViolence(currentTile:Cell, cells:Cell[]):boolean {
        let movingEnergy = this.calcMovingEnergy();
        let bestTile = currentTile;
        let fightEnergy =  this.Energy * (this.Genes.Punchy / 150);
        for(const t of cells){
            if (t.Animal && !t.Wall  // empty
                && t.Energy > movingEnergy // worth moving to
                && t.Energy > bestTile.Energy // best i've seen
                && t.Animal.Alive
                && t.Animal.Energy < fightEnergy  // wimp
                ) {
                bestTile = t;
            }
        }
        
        if (bestTile != currentTile){
            
            let threatAmount = this.Energy * (this.Genes.ThreatEnergy / 200);
            if (bestTile.Animal.Threaten(this, threatAmount, cells)) {
                //they listened to the threat and they retreated (or perhaps there was nowhere to go).
                //console.log("scared them");   
                if (bestTile.Animal == null) {
                    this.moveTo(currentTile, bestTile, movingEnergy);
                }
                return true;
            } else {
                //console.log("HITTING");
                this.HitAnimal(bestTile.Animal, threatAmount);
                return false;
            }
        }

        return false;
    }
    
    HitAnimal(targetAnimal:Animal, hitEnergy:number){
        //this.Energy -= ;
        this.incEnergy(hitEnergy/-2,"hit someone")
        targetAnimal.IGotHit(hitEnergy*2);
        targetAnimal.incEnergy(hitEnergy * -2,"got hit");
    }
    
    incEnergy(amount:number, reason:string) {
        this.Energy += amount;
        this.Log(reason,amount);
        if (this.Energy <= 0){
            this.Alive = false;
            this.Log("Died!",0);
            //console.log("Died of exhaustion.");
            this.NaturalCauses = false;
            causeOfDeathNatural.push(false);
            while(causeOfDeathNatural.length > deathsToTrack) causeOfDeathNatural.splice(0,1);
        } 
    }

    Threaten(aggressor:Animal, threatAmount:number, aggressorsNeighbors:Cell[]):boolean{
        //return true if the threat IS solid and respected (and we either had nowhere to run or we moved).
        //return false if we LAUGH in the face of this threat
        //let threatWeCanStand = this.Energy / 2; //todo -- better function using our genes
        let threatWeCanStand = this.Energy * (this.Genes.NotAfraid / 200); 
        if (threatAmount <= threatWeCanStand) return false;
        
        let currentTile = world.getCell(this.Col, this.Row);
        let neighborCells = world.getNeighborCells(this.Col, this.Row);
        let bestNeighbor = currentTile;
        let noEscape = true;

        // wonder if i can find the angle from the aggressor to me
        // and find the person who is further away...
        let bestEscapeTile:Cell = null;
        for(var t of neighborCells) {
            
            if (!t.Animal && !t.Wall){
                noEscape = false;
                if (!aggressorsNeighbors.includes(t)) {
                    //escape
                    if (bestEscapeTile == null) {
                        bestEscapeTile = t;
                    } else if (t.Energy > bestEscapeTile.Energy) {
                        bestEscapeTile = t;
                    }
                }

                if (t.Energy > bestNeighbor.Energy) {
                    bestNeighbor = t;
                } 
            }
        }


        if (noEscape) return true;
        if (bestNeighbor == currentTile) return false;

        //Don't go to the tile with the best energy... go to:
        // the best tile that is away from the aggressor *and* has the best energy.
        if (bestEscapeTile != null) bestNeighbor = bestEscapeTile;
        this.Log(`Ran from threat ${threatAmount} by ${aggressor.Id} to`, bestNeighbor.Energy);

        this.moveTo(currentTile, bestNeighbor, this.calcMovingEnergy());

        return true;
    }
    
    considerMating(cells:Cell[]) {
        if (this.Age < this.Genes.AgeOfMaturity) return;        
        if (this.Energy < this.Genes.MinMatingEnergy) return;
        if (this.Energy < this.Genes.EnergyToChild) return;

        //if their mating percent is just 10%... then 90% of the time they'll exit here.
        if (rando(100) > this.Genes.MatingPercent) return;
        // this means that 10% of the time, they are willing to consider mating.
        // whether or not they run into anyone... that's a different issue.
        
        let neighbors:Animal[] = [];
        let emptyCells:Cell[] = [];
        for(let cell of cells){
            if (cell.Animal) {
                // criteria to be a suitable mate:
                if (cell.Animal.Alive  // picky
                    && cell.Animal.Id != this.Id // avoid blindness
                    && cell.Animal.Age > cell.Animal.Genes.AgeOfMaturity
                    && cell.Animal.AdvertisedEnergy() > this.Genes.MinimumAcceptableEnergyInYourMate) {
                    neighbors.push(cell.Animal);
                }
            } else {
                if (!cell.Wall) {
                    emptyCells.push(cell);
                }
            }
        }

        //slim pickins.
        if (neighbors.length == 0 || neighbors.length >= 8) return;
        if (emptyCells.length == 0) return;

        //there were no mating opportunities anyway.
        //TODO: only consider mating if the area is not overcrowded.
        //TODO: only consider mating if you have enough energy
        //TODO: rank the suitors by most energy.
        //TODO: have other strategies for ranking suitors
        //TODO: suitors have their energy, but also: how much energy they advertise.

        //choose the best cell to place the child on.
        let bestCell = emptyCells[0];
        for(let cell of emptyCells) {
            if (cell.Energy > bestCell.Energy) {
                bestCell = cell;
            }
        }

        //TODO:  acceptable energy in a nest.
        //if (bestCell.Energy < 3) return;

        let potentialMate = neighbors[0];

        world.addAnimal(bestCell.Col, bestCell.Row, 0, this.Genes.EnergyToChild);
        let child = world.getCell(bestCell.Col, bestCell.Row).Animal;
        child.Generation = (this.Generation + potentialMate.Generation)/2 + 1;
        child.Genes = Crossover(this.Genes, potentialMate.Genes);
        child.Log(`Born from ${this.Id} and`, potentialMate.Id);
        child.Log(`Born with energy ${this.Genes.EnergyToChild}`, child.Energy);
        this.Log("Child with",potentialMate.Id);
        potentialMate.Log("Fathered Child with",this.Id);
        
        this.incEnergy(this.Genes.EnergyToChild * -1,"gave birth");
    }
    AdvertisedEnergy() {
        //todo: consider displaying a different amount of energy.
        //but note that it might take energy to lie about your amount of energy.
        return this.Energy;
    }

    addAge(tickDuration: number) {
        //if (!this.Alive) return;

        this.Age = Math.min(this.MaxAge, this.Age+tickDuration);
        
        //babySize is a fraction, e.g. 0.3, so that babies are not a tiny spec, but start at 30% of final size.
        this.Size = world.Settings.BabySize + ((1.0 - world.Settings.BabySize)*(this.Age / this.MaxAge)); //from 0..1.0
        //if (this.Age >= this.MaxAge) {
        if (this.Age >= this.MaxAge && this.Alive) {
            this.Alive = false;
            this.Log(`Died of old age, with energy ${this.Energy} at`, this.Age);
            this.NaturalCauses = true;
            causeOfDeathNatural.push(true);
            while(causeOfDeathNatural.length > deathsToTrack) causeOfDeathNatural.splice(0,1);
        }

        if (!this.Alive) {
            this.DeadDuration = Math.min(world.Settings.MaxDeadDuration, this.DeadDuration+tickDuration);
        }
    }

    constructor(col:number, row:number, age:number, initialEnergy:number) {
        this.Col = col;
        this.Row = row;
        this.Age = age;
        //this.Size = 0; //baby size
        this.Energy = initialEnergy; 
        this.Id = newId();
        this.Genes = getDefaultGenes();
        this.MaxAge = Math.floor((world.Settings.MaxAge * 0.80) + rando(world.Settings.MaxAge * 0.4));
        //console.log("MAX AGE: " + this.MaxAge);
        if (this.Age >= this.MaxAge) {
            this.Age = this.MaxAge - 1;
            if (this.Age < 0) this.Age = 0;
        }
    }
    color():string {
        if (!this.Alive) {
            //let fade = Math.max(0, 1 - (this.DeadDuration / this.MaxDeadDuration));
            if (this.DeadDuration < 1.2) {
                if (this.NaturalCauses) return `rgba(120,0,180,1)`; //purple
                return `rgba(160,0,0,1)`; //red
            }

            let fade = Math.max(0, 1 - (this.DeadDuration / world.Settings.MaxDeadDuration));
            let color = `rgba(20,20,20, ${fade})`;
            //console.log(color);
            return color;
        }
        if (this.iGotHit > 0){
            this.iGotHit--;
            return `rgba(0,0,255,1)`; //flash of bright blue
        }
        return `hsla(${Math.floor(this.Genes.Hugh*3.6)}, ${Math.floor(this.Genes.Saturation)}%, ${Math.floor(this.Genes.Lightness*0.6)}%, 0.9)`;
        //return 'rgba(12,100,200, 0.9)';
    }
    log:string[] = [];
    IGotHit(energy:number) {
        this.iGotHit += 5;
    }
    Log(event:string, amount:number){
        if (!world.Settings.VerboseLog) return;
        this.log.push(`${event}: ${amount}`);
    }
    Generation:number = 0;
    Col:number;
    Row:number;
    Size:number;
    Age:number; //when age = maxage... they die.
    MaxAge:number; //will be based on world.MaxAge but not exactly...
    Alive:boolean = true;
    NaturalCauses:boolean = null; // did we die from natural causes or other?
    DeadDuration:number = 0; //if dead... how long have they been dead?
    iGotHit:number = 0;
    Energy:number = 100;
    Id:number;
    Genes:Genes;
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

function getDefaultGenes() {
    return _defaultGenes;
}

let ss="";
let deaths = "";
function showStats() {
    //todo: ability to expand/collapse the stats.

    let averageGenes:Genes = new Genes();
    let minGenes:Genes = new Genes();
    let maxGenes:Genes = new Genes();

    for(var prop of Object.getOwnPropertyNames(averageGenes)){
        averageGenes[prop] = 0;
        minGenes[prop] = -1;
        maxGenes[prop] = 0;
    }

    let pop = 0;
    let averageEnergy:number = 0;
    let averageGeneration:number = 0;
    let averageAge:number = 0;
    let geneNames:string[] = [];
    for(let a of world.Animals) {
        if (a.Alive){
            pop++;
            averageEnergy+=a.Energy;
            averageGeneration+=a.Generation;
            averageAge+=a.Age;
            if (world.Tick % 50 == 1) {
                for(var prop of Object.getOwnPropertyNames(a.Genes)) {
                    let value = a.Genes[prop];
                    geneNames.push(prop);
                    averageGenes[prop] += value;
                    if (minGenes[prop] == -1 || value < minGenes[prop]) minGenes[prop] = value;
                    if (value > maxGenes[prop]) maxGenes[prop] = value;
                }
            }
        }
    }

    if (world.Tick % 50 == 1){
        ss = "";
        for(var prop of Object.getOwnPropertyNames(averageGenes)){
            averageGenes[prop] = averageGenes[prop]/pop;
            ss += `${toWords(prop)}: ${averageGenes[prop].toFixed(3)} (${minGenes[prop].toFixed(3)} - ${maxGenes[prop].toFixed(3)})<br />`;
        }

        if (causeOfDeathNatural.length > 0) {
            var natural:number = 0;
            for(var d of causeOfDeathNatural) {
                if(d) natural++;
            }
            deaths = "deaths: " + ((natural / causeOfDeathNatural.length) * 100 ).toFixed(2) + "% natural";
        }
    }

    world.Pop  = pop;
    let season = "winter";

    if (world.Settings.IsAlwaysSummer || world.ItIsSummer) season="summer";
    if (!world.Settings.IsAlwaysSummer) season+=` (day ${world.SeasonDay} of ${world.SeasonLength})`;

    //var energy rate: ${world.Settings.EnergyRate.toFixed(3)}<br/>
    //season: ${season}<br/>
    //var worldSettings = "";
    if (worldSettingsChanged) {
        worldSettings = "";
        var settings = world.Settings;
        for(var p of Object.getOwnPropertyNames(settings)) {
            worldSettings+=`${toWords(p)}: `;
            if ((typeof settings[p]) == 'number'){
                worldSettings+=`<input type='button' value='-' class='set_the_controls' title='decrease' onclick='dec("${p}");' /> ${settings[p].toFixed(2)} <input type='button' class='set_the_controls' value='+' title='increase' onclick='inc("${p}");' />`;
            } else {
                //boolean
                worldSettings+=`${settings[p]} <input type='button' value='/' class='set_the_controls' title='toggle' onclick='toggle("${p}");' />`;
            }
            worldSettings+='<br/>';
        }
        worldSettingsChanged = false;
    }
    $id('stats').innerHTML = `
population: ${pop}<br/>
tick: ${world.Tick}<br/>
${season}<br/>
${worldSettings}<br/>
${deaths}<br />
avg energy: ${(averageEnergy/pop).toFixed(2)}<br />
avg gen:  ${(averageGeneration/pop).toFixed(2)}<br />
avg age:  ${(averageAge/pop).toFixed(2)}<br />
${ss}`;


if (!paused) {
    removeClass(".set_the_controls", "for_the");
} else {
    addClass(".set_the_controls", "for_the");
}

}

function showHideStats(x:any) {
    let stats = $id('stats');
    if (stats.classList.contains('hidden')) {
        stats.classList.remove('hidden');
        x.value = "stats -";
    } else {
        stats.classList.add('hidden');
        x.value = "stats +";
    }
}

var paused = false;
function pause(x:any) {
    console.log("PAUAUAUAUAUASEEE");
    paused = !paused;
    x.value = (paused? "play" : "pause" );
    if (!paused) {
        removeClass(".set_the_controls", "for_the");
        draw2();
    } else {
        addClass(".set_the_controls", "for_the");
    }
}

let worldSettings:string = "";
let worldSettingsChanged:boolean = true;

function inc(p:string) {
    console.log(p);
    console.log(world.Settings);
    if (world.Settings[p] == 0) {
        world.Settings[p] += 20;
    } else {
        world.Settings[p] = world.Settings[p] * 1.05;
    }
    worldSettingsChanged = true;
    if (paused) showStats();
}

function dec(p:string) {
    console.log(p);
    console.log(world.Settings);
    world.Settings[p] = world.Settings[p] * 0.96;
    worldSettingsChanged = true;
    if (paused) showStats();
}

function toggle(p:string) {
    console.log(p);
    console.log(world.Settings);
    world.Settings[p] = !<boolean>(world.Settings[p]);
    worldSettingsChanged = true;
    if (paused) showStats();
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

//add the class of className to all elements that match the selector
function addClass(selector: string, className: string) {
    for(const example of $(selector)) {
        example.classList.add(className);
    }
}
  
//remove the class className from all elements that match the selector
function removeClass(selector: string, className: string) {
    for(const example of $(selector)) {
        example.classList.remove(className);
    }
}
  
// remove the class of className from all elements that have a class of className
function removeAllClass(className: string) {
    for(const example of $("." + className)) {
        example.classList.remove(className);
    }
}
  
function toWords(pascally:string) {
    return pascally.replace(/([a-z])([A-Z])/gm, "$1 $2");
}
/* end utility */

/* gene types */

function Crossover(parent1Genes:Genes, parent2Genes:Genes):Genes {
    var genes = new Genes();
    for(var prop of Object.getOwnPropertyNames(parent1Genes)) {
        genes[prop] = CombineGene(parent1Genes[prop], parent2Genes[prop]);
    }
    
    return genes;
}

function CombineGene(gene1:number, gene2:number):number {
    let result = gene1;
    let coin = rando(100);
    if (coin<50) result = gene2;

    let mutate = Math.min(rando(world.Settings.Mutate1),rando(world.Settings.Mutate2));
    coin = rando(100);
    if (coin<50) mutate *= -1;
    mutate = mutate/world.Settings.MutateDivisor;
    result += mutate;
    if (result > 100) result = 100;
    if (result < 0) result = 0;
    return result;
}

class Genes {
    MatingPercent:number = 100; // what percent of the time are you thinking about mating
    MinMatingEnergy:number = 30; //if less than this much energy, don't consider mating
    EnergyToChild:number = 8; // how much energy does a child start with
    MunchAmount:number = 100; //how much energy will they try to extract from the ground each chance they get
    AgeOfMaturity:number =1; //how old do they have to be before they can mate
    MinimumAcceptableEnergyInYourMate:number =1; //a pulse will do
    MaxEnergy:number =100;
    NotAfraid:number = 20; //if someone threatens us at this level or below we are not afraid
    Punchy:number = 50; //we will consider punching anyone with less energy than this threshold
    ThreatEnergy:number = 50; // this is the amunt of energy we'll put into a threat display (or first punch)
    Hugh:number =50;
    Saturation:number =50;
    Lightness:number =100;
}

const _defaultGenes = new Genes();

/* end gene types */

/* world parameters */
class Settings {
    InitialPopulationSize:number = 120;
    InitialColumns:number = 80;
    InitialRows:number = 40;
    IsAlwaysSummer:boolean = false;
    InitialSeasonLength:number = 1; // seasons are initially this length (unless 'is always summer' is true)
    DoSeasonsGetLonger:boolean = true;
    MaxSeasonLength:number = 120;

    MaxAge:number = 100; //How long do animals live
    MaxDeadDuration:number = 0.2; //How long does it take for animals bodies to break down
    // How much energy does grass receive on each tick?
    EnergyRate:number = 4.1; 
    // How much energy does it take an animal to stand still for one tick?
    StandingStillEnergy:number = 2.5;
    ConsiderViolence:boolean = true;
    // How many 'years' go by for every tick. (age is specified in years, not ticks.)
    TickDuration:number = 0.1; 

    // How much do we scale an animals genetic 'maxenergy' to find their true maximum energy.
    // This is a consequence of genes being limited between 0 and 100, but the practical range discovered experimentally being quite different
    EnergyUpscaleFactor:number = 7;
    
    // babySize is a fraction, e.g. 0.3, so that babies are not a tiny spec, but start at 30% of final size.
    BabySize:number=0.3;
    Mutate1:number = 100;
    Mutate2:number = 100;
    MutateDivisor:number = 20;
    AllowWalls:boolean = true;
    DrawBoxWalls:boolean = true;
    DrawCorridor:boolean = true;
    BoxWallSize:number = 8;
    // How many milliseconds to wait between rendering each frame
    Delay:number=0;
    VerboseLog:boolean = false;
}

/* end world parameters */

function populateGeneForm(id:string){
    var genes = getDefaultGenes();
    var ss = "<h2>Default (starting) gene values</h2>";
    for(var prop of Object.getOwnPropertyNames(genes)) {
        ss+=`<span class='label'>${toWords(prop)}</span><input type='text' id='${prop}' value='${genes[prop]}' /><br />`;
    }

    $id(id).innerHTML = ss;
}

function populateWorldForm(id:string) {
    var settings = new Settings();
    let ss = "<h2>World Settings</h2>";
    for(var p of Object.getOwnPropertyNames(settings)) {
        if ((typeof settings[p]) == 'number'){
            ss+=`<span class='label'>${toWords(p)}</span><input type='text' id='${p}' value='${settings[p]}' /><br />`;
        } else {
            ss+=`<label class='label' for='${p}'>${toWords(p)}</label><input type=checkbox id='${p}' name='${p}' ${(settings[p]?'checked=checked':'')} /><br />`;
        }
    }

    $id(id).innerHTML = ss;
}

function readGeneForm(id:string){
    var ss = "";
    var genes  = getDefaultGenes();
    //Updates the default genes!

    for(var prop of Object.getOwnPropertyNames(genes)){
        genes[prop] = parseFloat((<HTMLInputElement>$id(prop)).value);
        ss+=`_defaultGenes[${prop}] = parseFloat((<HTMLInputElement>$id('${prop}')).value); //${parseFloat((<HTMLInputElement>$id(prop)).value)}\r\n`;
    }

    console.log(ss);
}

function readWorldForm(id:string){
    var ss = "";
    var settings = world.Settings;
    
    for(var p of Object.getOwnPropertyNames(settings)) {
        if ((typeof settings[p]) == 'number'){
            settings[p] = parseFloat((<HTMLInputElement>$id(p)).value);
        } else {
            //boolean
            settings[p] = (<HTMLInputElement>$id(p)).checked;
        }
    }
    console.log(JSON.stringify(settings));
}

var mouseDown:boolean = false;


document.addEventListener("DOMContentLoaded", function () {
    populateGeneForm('geneForm');
    populateWorldForm('worldForm');
    

    
    
    $id('go').addEventListener('click', function() {
        readGeneForm('geneForm');
        removeClass('.startHidden', 'startHidden');
        $id('stats').classList.add('hidden');
        //showHideStats($id('showHideStats'));
        
        canvas = <HTMLCanvasElement>document.getElementById("html-canvas");
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        ctx = canvas.getContext("2d");
        world = new World(canvas.clientWidth, canvas.clientHeight);
        readWorldForm('worldForm');
        world.initialize();
        
        // hide the forms, and the go button.
        $id('geneForm').classList.add('hidden');
        $id('worldForm').classList.add('hidden');
        $id('go').classList.add('hidden');

        canvas.addEventListener('mousedown', function(e) { 
            //if (paused) return;
            mouseDown = true;
            placeWall(canvas, e, true);
        }, false);

        canvas.addEventListener('mouseup', function(e) { 
            //if (paused) return;
            mouseDown = false;
            //getCursorPosition(canvas, e);
        }, false);


        canvas.addEventListener('mousemove', function(e) { 
            
            if (mouseDown){
                placeWall(canvas, e, false);
            }
        }, false);

        draw2();
    });
}, false);



function placeWall(canvas:HTMLCanvasElement, event, toggler:boolean) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    var c = world.getCellAtXY(x,y);
    console.log(x,y,c);
    if (paused) {
        mouseDown = false;
        if (toggler) {
            console.log(c);
            if (c.Animal && c.Animal.log.length > 0) alert(JSON.stringify(c.Animal.log, null, ' ')) 
            else if (c.Animal) alert(JSON.stringify(c.Animal, null, ' ')) 
            else if (c.log.length > 0) alert(JSON.stringify(c.log, null, ' ')) 
            else alert(JSON.stringify(c, null, ' '));
        }
        return;
    } 
    
    if (!world.Settings.AllowWalls) return;

    if (!c.Wall) {
        world.InjectWall(c.Col, c.Row);
    } else {
        if (toggler) c.Wall = null;
        //
    }
}
