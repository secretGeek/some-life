var canvas;
var ctx;
var world;
var causeOfDeathNatural = [];
var deathsToTrack = 100; //number of recent deaths to keep track of for stats reasons.
// what is the display size of a baby (relative to an adult) (e.g. 10% of adult size, then 0.1)
//Feature to consider:
// walls
//predation
// has a level ... and the chances of 
function draw2() {
    if (!world.Trails)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    world.Tick++;
    world.SeasonDay++;
    if (world.SeasonDay >= world.SeasonLength) {
        world.ItIsSummer = !world.ItIsSummer;
        //this causes a strange seasonal change I find intriguing...
        if (world.Settings.DoSeasonsGetLonger)
            world.SeasonLength++;
        //in case the setting has been altered to a non-integer value... round it now.
        if (world.Settings.MaxSeasonLength > 0)
            world.Settings.MaxSeasonLength = Math.floor(world.Settings.MaxSeasonLength);
        if (world.Settings.MaxSeasonLength > 0)
            world.SeasonLength = Math.min(world.Settings.MaxSeasonLength, world.SeasonLength);
        world.SeasonDay = 0;
    }
    for (var _i = 0, _a = world.Cells; _i < _a.length; _i++) {
        var cell = _a[_i];
        if (world.Settings.IsAlwaysSummer || world.ItIsSummer)
            cell.addEnergy(world.Settings.EnergyRate, "flow");
        drawCell(world, cell);
    }
    var deadHeap = [];
    for (var _b = 0, _c = world.Animals; _b < _c.length; _b++) {
        var animal = _c[_b];
        animal.takeTurn(world);
        animal.addAge(world.Settings.TickDuration);
        if (!animal.Alive && animal.DeadDuration >= world.Settings.MaxDeadDuration) {
            deadHeap.push(animal);
        }
        else {
            drawAnimal(world, animal);
        }
    }
    for (var _d = 0, deadHeap_1 = deadHeap; _d < deadHeap_1.length; _d++) {
        var deady = deadHeap_1[_d];
        //let deady = deadHeap[deadIndex];
        var cell = world.getCell(deady.Col, deady.Row);
        cell.Animal = null;
        var index = world.Animals.indexOf(deady);
        world.Animals.splice(index, 1);
        // poof! and it's gone!
    }
    if (world.Pop != 0 && !paused) {
        showStats();
        if (world.Settings.Delay == 0) {
            requestAnimationFrame(draw2);
        }
        else {
            setTimeout(function () { requestAnimationFrame(draw2); }, world.Settings.Delay);
        }
    }
}
var Wall = /** @class */ (function () {
    function Wall(height) {
        this.Height = height;
    }
    return Wall;
}());
var World = /** @class */ (function () {
    function World(canvasWidth, canvasHeight) {
        this.Pop = -1;
        this.Settings = new Settings();
        this.ItIsSummer = true; //starts true, may or may not ever change, depending on settings.
        this.SeasonDay = 0; //today is the nth day of the current season.
        this.Tick = 0;
        this.Trails = false;
        this.CanvasWidth = canvasWidth;
        this.CanvasHeight = canvasHeight;
    }
    World.prototype.InjectWall = function (col, row) {
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
    };
    World.prototype.getCellAtXY = function (x, y) {
        var column = Math.floor(x / this.WidthOfCell);
        var row = Math.floor(y / this.HeightOfCell);
        var c = this.getCell(column, row);
        return c;
    };
    World.prototype.initialize = function () {
        this.Cells = [];
        this.Columns = Math.floor(this.Settings.InitialColumns);
        this.Rows = Math.floor(this.Settings.InitialRows);
        this.WidthOfCell = this.CanvasWidth / this.Columns;
        this.HeightOfCell = this.CanvasHeight / this.Rows;
        for (var row = 0; row < this.Rows; row++) {
            for (var col = 0; col < this.Columns; col++) {
                var cell = new Cell(col, row);
                this.Cells.push(cell);
            }
        }
        console.log("For squarer cells, keep #rows and set cols to: " + ((this.CanvasWidth / this.CanvasHeight) * this.Rows));
        console.log("...or keep # cols and set rows to: " + ((this.CanvasHeight / this.CanvasWidth) * this.Columns));
        if (this.Settings.DrawBoxWalls) {
            // Draw a grid!
            for (var x = 0; x < this.Columns / this.Settings.BoxWallSize; x++) {
                for (var y = 0; y < this.Rows; y++) {
                    this.InjectWall(x * this.Settings.BoxWallSize, y);
                }
            }
            for (var y = 0; y < this.Rows / this.Settings.BoxWallSize; y++) {
                for (var x = 0; x < this.Columns; x++) {
                    this.InjectWall(x, y * this.Settings.BoxWallSize);
                }
            }
        }
        else if (this.Settings.DrawCorridor) {
            // Draw a series of walls that create one long winding corridor
            // outer square
            for (var x = 0; x < this.Columns; x++) {
                this.InjectWall(x, 0);
                //this.InjectWall(x, this.Rows-1);
            }
            for (var y = 0; y < this.Rows; y++) {
                this.InjectWall(0, y);
                //this.InjectWall(this.Columns - 1, y);
            }
            for (var x = 1; x < this.Columns / 2; x++) {
                for (var y = (x % 2) + 1; y < this.Rows - ((x + 1) % 2); y++) {
                    this.InjectWall(x * 2, y);
                }
            }
        }
        this.SeasonLength = Math.floor(this.Settings.InitialSeasonLength);
        if (this.Settings.InitialPopulationSize > this.Columns * this.Rows) {
            console.log("Too many animals to fit into a world of this size. Reducing initial pop size");
            this.Settings.InitialPopulationSize = (this.Columns * this.Rows);
        }
        this.Animals = [];
        while (this.Animals.length < this.Settings.InitialPopulationSize) {
            this.tryAddAnimal();
        }
        console.log(this);
    };
    World.prototype.tryAddAnimal = function () {
        var col = rando(this.Columns);
        var row = rando(this.Rows);
        var age = rando(100);
        var initialEnergy = 100;
        return this.addAnimal(col, row, age, initialEnergy);
    };
    World.prototype.addAnimal = function (col, row, age, initialEnergy) {
        var cell = this.getCell(col, row);
        if (cell.Animal == null) {
            var animal = new Animal(col, row, age, initialEnergy);
            this.Animals.push(animal);
            cell.Animal = animal;
            return true;
        }
        else {
            return false;
        }
    };
    World.prototype.getCell = function (col, row) {
        return this.Cells[col + (row * this.Columns)];
    };
    // get the 8 cells that surround this cell and return them in random order.
    World.prototype.getNeighborCells = function (col, row) {
        var result = [];
        //TODO: a neighborhood could be a larger area, consider 3x3, 5x5, 7x7... 
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var offsetX = i - 1; //minus (side-1)/2, e.g. side defaults to 3, but could 5,7,9
                var offsetY = j - 1; //minus (side-1)/2
                var newX = col + offsetX;
                var newY = row + offsetY;
                if (newX < 0)
                    newX = this.Columns + newX; //wrap...
                if (newY < 0)
                    newY = this.Rows + newY; //...around!
                if (newX >= this.Columns)
                    newX = this.Columns - newX;
                if (newY >= this.Rows)
                    newY = this.Rows - newY;
                if (offsetX != 0 || offsetY != 0) // ignore current tile...
                 {
                    var cell = this.getCell(newX, newY);
                    result.push(cell);
                }
            }
        }
        return shuffle(result);
    };
    return World;
}());
var Cell = /** @class */ (function () {
    function Cell(col, row) {
        this.log = [];
        this.Col = col;
        this.Row = row;
        this.Energy = rando(100);
    }
    Cell.prototype.color = function () {
        if (this.Wall) {
            return "rgb(120,110,110)";
        }
        return "hsla(120, 69%, " + Math.floor((this.Energy * 0.4) + 5) + "%, 0.9)";
    };
    Cell.prototype.Log = function (event, amount) {
        if (!world.Settings.VerboseLog)
            return;
        this.log.push(event + ": " + amount);
    };
    Cell.prototype.addEnergy = function (amount, reason) {
        var initialEnergy = this.Energy;
        //cannot be less than zero, cannot be greater than 100.
        this.Energy = Math.max(0, Math.min(100, this.Energy + amount));
        this.Log(reason, amount);
        return (this.Energy - initialEnergy); //how much difference did it make;
    };
    return Cell;
}());
function drawCell(world, cell) {
    ctx.fillStyle = cell.color();
    ctx.beginPath();
    ctx.fillRect(world.WidthOfCell * cell.Col, world.HeightOfCell * cell.Row, world.WidthOfCell, world.HeightOfCell);
    ctx.stroke();
}
var Animal = /** @class */ (function () {
    function Animal(col, row, age, initialEnergy) {
        this.log = [];
        this.Generation = 0;
        this.Alive = true;
        this.NaturalCauses = null; // did we die from natural causes or other?
        this.DeadDuration = 0; //if dead... how long have they been dead?
        this.iGotHit = 0;
        this.Energy = 100;
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
            if (this.Age < 0)
                this.Age = 0;
        }
    }
    Animal.prototype.takeTurn = function (world) {
        if (!this.Alive)
            return;
        var currentTile = world.getCell(this.Col, this.Row);
        var neighbors = world.getNeighborCells(this.Col, this.Row);
        var bestNeighbor = currentTile;
        for (var _i = 0, neighbors_1 = neighbors; _i < neighbors_1.length; _i++) {
            var t = neighbors_1[_i];
            if (!t.Animal && !t.Wall && t.Energy > bestNeighbor.Energy) {
                bestNeighbor = t;
            }
        }
        //TODO: could have some strategy for when it's worth moving.
        // could also have some strategy for moving even when it's not worth moving.
        // (if/when i have altitude -- the energy of moving will be based on altitude as well.)
        // energy taken to move depends on our current "mass" which is our stored energy.
        var movingEnergy = this.calcMovingEnergy();
        var weMoved = false;
        var standingStillEnergy = world.Settings.StandingStillEnergy;
        if (bestNeighbor == currentTile
            || bestNeighbor.Energy > movingEnergy) {
            if (bestNeighbor != currentTile) {
                // gonna move!
                weMoved = true;
                this.moveTo(currentTile, bestNeighbor, movingEnergy);
                currentTile = bestNeighbor;
            }
            else {
                // didn't move, but standing still takes energy.
                this.incEnergy(standingStillEnergy * -1, "standing still");
            }
            //woah, moving or standing still... it wiped us out!
            if (!this.Alive)
                return;
            //eat some energy...
            var munchAmount = this.Genes.MunchAmount;
            if (this.Energy + munchAmount > (this.Genes.MaxEnergy * world.Settings.EnergyUpscaleFactor)) {
                // don't try to eat more than you can store!
                munchAmount = (this.Genes.MaxEnergy * world.Settings.EnergyUpscaleFactor) - this.Energy;
            }
            //and you can't eat more than the cell can give you!
            munchAmount = -1 * bestNeighbor.addEnergy(-1 * munchAmount, "munched");
            //console.log(`munch amount: ${munchAmount}`);
            //this.Energy += munchAmount;
            this.incEnergy(munchAmount, "ate grass");
            if (this.Energy > (this.Genes.MaxEnergy * world.Settings.EnergyUpscaleFactor)) {
                console.log("I have more energy than I thought possible! munched:" + munchAmount + " new_energy:" + this.Energy + " max:" + this.Genes.MaxEnergy);
            }
        }
        else {
            //standing still...
            //how much does that cost?
            this.incEnergy(standingStillEnergy * -1, "standing still");
            if (!this.Alive)
                return;
        }
        var weFought = false;
        if (!weMoved) {
            //consider violence.
            if (world.Settings.ConsiderViolence)
                this.considerViolence(currentTile, neighbors);
        }
        if (!this.Alive)
            return;
        neighbors = world.getNeighborCells(this.Col, this.Row);
        if (this.Age >= this.Genes.AgeOfMaturity) {
            this.considerMating(neighbors);
        }
    };
    Animal.prototype.moveTo = function (currentTile, bestNeighbor, movingEnergy) {
        currentTile.Animal = null;
        bestNeighbor.Animal = this;
        this.Col = bestNeighbor.Col;
        this.Row = bestNeighbor.Row;
        this.incEnergy(movingEnergy * -1, "moved with energy " + this.Energy);
    };
    Animal.prototype.calcMovingEnergy = function () {
        //The amount of energy it takes to move depends on how much energy we have, 
        // which is considered analgous to our mass.
        return (this.Energy / 40) + 3;
    };
    Animal.prototype.considerViolence = function (currentTile, cells) {
        var movingEnergy = this.calcMovingEnergy();
        var bestTile = currentTile;
        var fightEnergy = this.Energy * (this.Genes.Punchy / 150);
        for (var _i = 0, cells_1 = cells; _i < cells_1.length; _i++) {
            var t = cells_1[_i];
            if (t.Animal && !t.Wall // empty
                && t.Energy > movingEnergy // worth moving to
                && t.Energy > bestTile.Energy // best i've seen
                && t.Animal.Alive
                && t.Animal.Energy < fightEnergy // wimp
            ) {
                bestTile = t;
            }
        }
        if (bestTile != currentTile) {
            var threatAmount = this.Energy * (this.Genes.ThreatEnergy / 200);
            if (bestTile.Animal.Threaten(this, threatAmount, cells)) {
                //they listened to the threat and they retreated (or perhaps there was nowhere to go).
                //console.log("scared them");   
                if (bestTile.Animal == null) {
                    this.moveTo(currentTile, bestTile, movingEnergy);
                }
                return true;
            }
            else {
                //console.log("HITTING");
                this.HitAnimal(bestTile.Animal, threatAmount);
                return false;
            }
        }
        return false;
    };
    Animal.prototype.HitAnimal = function (targetAnimal, hitEnergy) {
        //this.Energy -= ;
        this.incEnergy(hitEnergy / -2, "hit someone");
        targetAnimal.IGotHit(hitEnergy * 2);
        targetAnimal.incEnergy(hitEnergy * -2, "got hit");
    };
    Animal.prototype.incEnergy = function (amount, reason) {
        this.Energy += amount;
        this.Log(reason, amount);
        if (this.Energy <= 0) {
            this.Alive = false;
            this.Log("Died!", 0);
            //console.log("Died of exhaustion.");
            this.NaturalCauses = false;
            causeOfDeathNatural.push(false);
            while (causeOfDeathNatural.length > deathsToTrack)
                causeOfDeathNatural.splice(0, 1);
        }
    };
    Animal.prototype.Threaten = function (aggressor, threatAmount, aggressorsNeighbors) {
        //return true if the threat IS solid and respected (and we either had nowhere to run or we moved).
        //return false if we LAUGH in the face of this threat
        //let threatWeCanStand = this.Energy / 2; //todo -- better function using our genes
        var threatWeCanStand = this.Energy * (this.Genes.NotAfraid / 200);
        if (threatAmount <= threatWeCanStand)
            return false;
        var currentTile = world.getCell(this.Col, this.Row);
        var neighborCells = world.getNeighborCells(this.Col, this.Row);
        var bestNeighbor = currentTile;
        var noEscape = true;
        // wonder if i can find the angle from the aggressor to me
        // and find the person who is further away...
        var bestEscapeTile = null;
        for (var _i = 0, neighborCells_1 = neighborCells; _i < neighborCells_1.length; _i++) {
            var t = neighborCells_1[_i];
            if (!t.Animal && !t.Wall) {
                noEscape = false;
                if (!aggressorsNeighbors.includes(t)) {
                    //escape
                    if (bestEscapeTile == null) {
                        bestEscapeTile = t;
                    }
                    else if (t.Energy > bestEscapeTile.Energy) {
                        bestEscapeTile = t;
                    }
                }
                if (t.Energy > bestNeighbor.Energy) {
                    bestNeighbor = t;
                }
            }
        }
        if (noEscape)
            return true;
        if (bestNeighbor == currentTile)
            return false;
        //Don't go to the tile with the best energy... go to:
        // the best tile that is away from the aggressor *and* has the best energy.
        if (bestEscapeTile != null)
            bestNeighbor = bestEscapeTile;
        this.Log("Ran from threat " + threatAmount + " by " + aggressor.Id + " to", bestNeighbor.Energy);
        this.moveTo(currentTile, bestNeighbor, this.calcMovingEnergy());
        return true;
    };
    Animal.prototype.considerMating = function (cells) {
        if (this.Age < this.Genes.AgeOfMaturity)
            return;
        if (this.Energy < this.Genes.MinMatingEnergy)
            return;
        if (this.Energy < this.Genes.EnergyToChild)
            return;
        //if their mating percent is just 10%... then 90% of the time they'll exit here.
        if (rando(100) > this.Genes.MatingPercent)
            return;
        // this means that 10% of the time, they are willing to consider mating.
        // whether or not they run into anyone... that's a different issue.
        var neighbors = [];
        var emptyCells = [];
        for (var _i = 0, cells_2 = cells; _i < cells_2.length; _i++) {
            var cell = cells_2[_i];
            if (cell.Animal) {
                // criteria to be a suitable mate:
                if (cell.Animal.Alive // picky
                    && cell.Animal.Id != this.Id // avoid blindness
                    && cell.Animal.Age > cell.Animal.Genes.AgeOfMaturity
                    && cell.Animal.AdvertisedEnergy() > this.Genes.MinimumAcceptableEnergyInYourMate) {
                    neighbors.push(cell.Animal);
                }
            }
            else {
                if (!cell.Wall) {
                    emptyCells.push(cell);
                }
            }
        }
        //slim pickins.
        if (neighbors.length == 0 || neighbors.length >= 8)
            return;
        if (emptyCells.length == 0)
            return;
        //there were no mating opportunities anyway.
        //TODO: only consider mating if the area is not overcrowded.
        //TODO: only consider mating if you have enough energy
        //TODO: rank the suitors by most energy.
        //TODO: have other strategies for ranking suitors
        //TODO: suitors have their energy, but also: how much energy they advertise.
        //choose the best cell to place the child on.
        var bestCell = emptyCells[0];
        for (var _a = 0, emptyCells_1 = emptyCells; _a < emptyCells_1.length; _a++) {
            var cell = emptyCells_1[_a];
            if (cell.Energy > bestCell.Energy) {
                bestCell = cell;
            }
        }
        //TODO:  acceptable energy in a nest.
        //if (bestCell.Energy < 3) return;
        var potentialMate = neighbors[0];
        world.addAnimal(bestCell.Col, bestCell.Row, 0, this.Genes.EnergyToChild);
        var child = world.getCell(bestCell.Col, bestCell.Row).Animal;
        child.Generation = (this.Generation + potentialMate.Generation) / 2 + 1;
        child.Genes = Crossover(this.Genes, potentialMate.Genes);
        child.Log("Born from " + this.Id + " and", potentialMate.Id);
        child.Log("Born with energy " + this.Genes.EnergyToChild, child.Energy);
        this.Log("Child with", potentialMate.Id);
        potentialMate.Log("Fathered Child with", this.Id);
        this.incEnergy(this.Genes.EnergyToChild * -1, "gave birth");
    };
    Animal.prototype.AdvertisedEnergy = function () {
        //todo: consider displaying a different amount of energy.
        //but note that it might take energy to lie about your amount of energy.
        return this.Energy;
    };
    Animal.prototype.addAge = function (tickDuration) {
        //if (!this.Alive) return;
        this.Age = Math.min(this.MaxAge, this.Age + tickDuration);
        //babySize is a fraction, e.g. 0.3, so that babies are not a tiny spec, but start at 30% of final size.
        this.Size = world.Settings.BabySize + ((1.0 - world.Settings.BabySize) * (this.Age / this.MaxAge)); //from 0..1.0
        //if (this.Age >= this.MaxAge) {
        if (this.Age >= this.MaxAge && this.Alive) {
            this.Alive = false;
            this.Log("Died of old age, with energy " + this.Energy + " at", this.Age);
            this.NaturalCauses = true;
            causeOfDeathNatural.push(true);
            while (causeOfDeathNatural.length > deathsToTrack)
                causeOfDeathNatural.splice(0, 1);
        }
        if (!this.Alive) {
            this.DeadDuration = Math.min(world.Settings.MaxDeadDuration, this.DeadDuration + tickDuration);
        }
    };
    Animal.prototype.color = function () {
        if (!this.Alive) {
            //let fade = Math.max(0, 1 - (this.DeadDuration / this.MaxDeadDuration));
            if (this.DeadDuration < 1.2) {
                if (this.NaturalCauses)
                    return "rgba(120,0,180,1)"; //purple
                return "rgba(160,0,0,1)"; //red
            }
            var fade = Math.max(0, 1 - (this.DeadDuration / world.Settings.MaxDeadDuration));
            var color = "rgba(20,20,20, " + fade + ")";
            //console.log(color);
            return color;
        }
        if (this.iGotHit > 0) {
            this.iGotHit--;
            return "rgba(0,0,255,1)"; //flash of bright blue
        }
        return "hsla(" + Math.floor(this.Genes.Hugh * 3.6) + ", " + Math.floor(this.Genes.Saturation) + "%, " + Math.floor(this.Genes.Lightness * 0.6) + "%, 0.9)";
        //return 'rgba(12,100,200, 0.9)';
    };
    Animal.prototype.IGotHit = function (energy) {
        this.iGotHit += 5;
    };
    Animal.prototype.Log = function (event, amount) {
        if (!world.Settings.VerboseLog)
            return;
        this.log.push(event + ": " + amount);
    };
    return Animal;
}());
function drawAnimal(world, animal) {
    ctx.fillStyle = animal.color();
    ctx.beginPath();
    ctx.strokeStyle = animal.color();
    ctx.lineWidth = 1;
    ctx.arc(world.WidthOfCell * animal.Col + (world.WidthOfCell / 2), world.HeightOfCell * animal.Row + (world.HeightOfCell / 2), animal.Size * (Math.min(world.WidthOfCell, world.HeightOfCell) / 2), 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}
function getDefaultGenes() {
    return _defaultGenes;
}
var ss = "";
var deaths = "";
function showStats() {
    //todo: ability to expand/collapse the stats.
    var averageGenes = new Genes();
    var minGenes = new Genes();
    var maxGenes = new Genes();
    for (var _i = 0, _a = Object.getOwnPropertyNames(averageGenes); _i < _a.length; _i++) {
        var prop = _a[_i];
        averageGenes[prop] = 0;
        minGenes[prop] = -1;
        maxGenes[prop] = 0;
    }
    var pop = 0;
    var averageEnergy = 0;
    var averageGeneration = 0;
    var averageAge = 0;
    var geneNames = [];
    for (var _b = 0, _c = world.Animals; _b < _c.length; _b++) {
        var a = _c[_b];
        if (a.Alive) {
            pop++;
            averageEnergy += a.Energy;
            averageGeneration += a.Generation;
            averageAge += a.Age;
            if (world.Tick % 50 == 1) {
                for (var _d = 0, _e = Object.getOwnPropertyNames(a.Genes); _d < _e.length; _d++) {
                    var prop = _e[_d];
                    var value = a.Genes[prop];
                    geneNames.push(prop);
                    averageGenes[prop] += value;
                    if (minGenes[prop] == -1 || value < minGenes[prop])
                        minGenes[prop] = value;
                    if (value > maxGenes[prop])
                        maxGenes[prop] = value;
                }
            }
        }
    }
    if (world.Tick % 50 == 1) {
        ss = "";
        for (var _f = 0, _g = Object.getOwnPropertyNames(averageGenes); _f < _g.length; _f++) {
            var prop = _g[_f];
            averageGenes[prop] = averageGenes[prop] / pop;
            ss += toWords(prop) + ": " + averageGenes[prop].toFixed(3) + " (" + minGenes[prop].toFixed(3) + " - " + maxGenes[prop].toFixed(3) + ")<br />";
        }
        if (causeOfDeathNatural.length > 0) {
            var natural = 0;
            for (var _h = 0, causeOfDeathNatural_1 = causeOfDeathNatural; _h < causeOfDeathNatural_1.length; _h++) {
                var d = causeOfDeathNatural_1[_h];
                if (d)
                    natural++;
            }
            deaths = "deaths: " + ((natural / causeOfDeathNatural.length) * 100).toFixed(2) + "% natural";
        }
    }
    world.Pop = pop;
    var season = "winter";
    if (world.Settings.IsAlwaysSummer || world.ItIsSummer)
        season = "summer";
    if (!world.Settings.IsAlwaysSummer)
        season += " (day " + world.SeasonDay + " of " + world.SeasonLength + ")";
    //var energy rate: ${world.Settings.EnergyRate.toFixed(3)}<br/>
    //season: ${season}<br/>
    //var worldSettings = "";
    if (worldSettingsChanged) {
        worldSettings = "";
        var settings = world.Settings;
        for (var _j = 0, _k = Object.getOwnPropertyNames(settings); _j < _k.length; _j++) {
            var p = _k[_j];
            worldSettings += toWords(p) + ": ";
            if ((typeof settings[p]) == 'number') {
                worldSettings += "<input type='button' value='-' class='set_the_controls' title='decrease' onclick='dec(\"" + p + "\");' /> " + settings[p].toFixed(2) + " <input type='button' class='set_the_controls' value='+' title='increase' onclick='inc(\"" + p + "\");' />";
            }
            else {
                //boolean
                worldSettings += settings[p] + " <input type='button' value='/' class='set_the_controls' title='toggle' onclick='toggle(\"" + p + "\");' />";
            }
            worldSettings += '<br/>';
        }
        worldSettingsChanged = false;
    }
    $id('stats').innerHTML = "\npopulation: " + pop + "<br/>\ntick: " + world.Tick + "<br/>\n" + season + "<br/>\n" + worldSettings + "<br/>\n" + deaths + "<br />\navg energy: " + (averageEnergy / pop).toFixed(2) + "<br />\navg gen:  " + (averageGeneration / pop).toFixed(2) + "<br />\navg age:  " + (averageAge / pop).toFixed(2) + "<br />\n" + ss;
    if (!paused) {
        removeClass(".set_the_controls", "for_the");
    }
    else {
        addClass(".set_the_controls", "for_the");
    }
}
function showHideStats(x) {
    var stats = $id('stats');
    if (stats.classList.contains('hidden')) {
        stats.classList.remove('hidden');
        x.value = "stats -";
    }
    else {
        stats.classList.add('hidden');
        x.value = "stats +";
    }
}
var paused = false;
function pause(x) {
    console.log("PAUAUAUAUAUASEEE");
    paused = !paused;
    x.value = (paused ? "play" : "pause");
    if (!paused) {
        removeClass(".set_the_controls", "for_the");
        draw2();
    }
    else {
        addClass(".set_the_controls", "for_the");
    }
}
var worldSettings = "";
var worldSettingsChanged = true;
function inc(p) {
    console.log(p);
    console.log(world.Settings);
    if (world.Settings[p] == 0) {
        world.Settings[p] += 20;
    }
    else {
        world.Settings[p] = world.Settings[p] * 1.05;
    }
    worldSettingsChanged = true;
    if (paused)
        showStats();
}
function dec(p) {
    console.log(p);
    console.log(world.Settings);
    world.Settings[p] = world.Settings[p] * 0.96;
    worldSettingsChanged = true;
    if (paused)
        showStats();
}
function toggle(p) {
    console.log(p);
    console.log(world.Settings);
    world.Settings[p] = !(world.Settings[p]);
    worldSettingsChanged = true;
    if (paused)
        showStats();
}
/* utility functions */
var id = 0;
function newId() {
    return ++id;
}
function rando(max) {
    return Math.floor(Math.random() * max);
}
/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    var j, x;
    for (var i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}
function $(selector) {
    return document.querySelectorAll(selector);
}
function $id(id) {
    return document.getElementById(id);
}
//add the class of className to all elements that match the selector
function addClass(selector, className) {
    for (var _i = 0, _a = $(selector); _i < _a.length; _i++) {
        var example = _a[_i];
        example.classList.add(className);
    }
}
//remove the class className from all elements that match the selector
function removeClass(selector, className) {
    for (var _i = 0, _a = $(selector); _i < _a.length; _i++) {
        var example = _a[_i];
        example.classList.remove(className);
    }
}
// remove the class of className from all elements that have a class of className
function removeAllClass(className) {
    for (var _i = 0, _a = $("." + className); _i < _a.length; _i++) {
        var example = _a[_i];
        example.classList.remove(className);
    }
}
function toWords(pascally) {
    return pascally.replace(/([a-z])([A-Z])/gm, "$1 $2");
}
/* end utility */
/* gene types */
function Crossover(parent1Genes, parent2Genes) {
    var genes = new Genes();
    for (var _i = 0, _a = Object.getOwnPropertyNames(parent1Genes); _i < _a.length; _i++) {
        var prop = _a[_i];
        genes[prop] = CombineGene(parent1Genes[prop], parent2Genes[prop]);
    }
    return genes;
}
function CombineGene(gene1, gene2) {
    var result = gene1;
    var coin = rando(100);
    if (coin < 50)
        result = gene2;
    var mutate = Math.min(rando(world.Settings.Mutate1), rando(world.Settings.Mutate2));
    coin = rando(100);
    if (coin < 50)
        mutate *= -1;
    mutate = mutate / world.Settings.MutateDivisor;
    result += mutate;
    if (result > 100)
        result = 100;
    if (result < 0)
        result = 0;
    return result;
}
var Genes = /** @class */ (function () {
    function Genes() {
        this.MatingPercent = 100; // what percent of the time are you thinking about mating
        this.MinMatingEnergy = 30; //if less than this much energy, don't consider mating
        this.EnergyToChild = 8; // how much energy does a child start with
        this.MunchAmount = 100; //how much energy will they try to extract from the ground each chance they get
        this.AgeOfMaturity = 1; //how old do they have to be before they can mate
        this.MinimumAcceptableEnergyInYourMate = 1; //a pulse will do
        this.MaxEnergy = 100;
        this.NotAfraid = 20; //if someone threatens us at this level or below we are not afraid
        this.Punchy = 50; //we will consider punching anyone with less energy than this threshold
        this.ThreatEnergy = 50; // this is the amunt of energy we'll put into a threat display (or first punch)
        this.Hugh = 50;
        this.Saturation = 50;
        this.Lightness = 100;
    }
    return Genes;
}());
var _defaultGenes = new Genes();
/* end gene types */
/* world parameters */
var Settings = /** @class */ (function () {
    function Settings() {
        this.InitialPopulationSize = 120;
        this.InitialColumns = 80;
        this.InitialRows = 40;
        this.IsAlwaysSummer = false;
        this.InitialSeasonLength = 1; // seasons are initially this length (unless 'is always summer' is true)
        this.DoSeasonsGetLonger = true;
        this.MaxSeasonLength = 120;
        this.MaxAge = 100; //How long do animals live
        this.MaxDeadDuration = 0.2; //How long does it take for animals bodies to break down
        // How much energy does grass receive on each tick?
        this.EnergyRate = 4.1;
        // How much energy does it take an animal to stand still for one tick?
        this.StandingStillEnergy = 2.5;
        this.ConsiderViolence = true;
        // How many 'years' go by for every tick. (age is specified in years, not ticks.)
        this.TickDuration = 0.1;
        // How much do we scale an animals genetic 'maxenergy' to find their true maximum energy.
        // This is a consequence of genes being limited between 0 and 100, but the practical range discovered experimentally being quite different
        this.EnergyUpscaleFactor = 7;
        // babySize is a fraction, e.g. 0.3, so that babies are not a tiny spec, but start at 30% of final size.
        this.BabySize = 0.3;
        this.Mutate1 = 100;
        this.Mutate2 = 100;
        this.MutateDivisor = 20;
        this.AllowWalls = true;
        this.DrawBoxWalls = true;
        this.DrawCorridor = true;
        this.BoxWallSize = 8;
        // How many milliseconds to wait between rendering each frame
        this.Delay = 0;
        this.VerboseLog = false;
    }
    return Settings;
}());
/* end world parameters */
function populateGeneForm(id) {
    var genes = getDefaultGenes();
    var ss = "<h2>Default (starting) gene values</h2>";
    for (var _i = 0, _a = Object.getOwnPropertyNames(genes); _i < _a.length; _i++) {
        var prop = _a[_i];
        ss += "<span class='label'>" + toWords(prop) + "</span><input type='text' id='" + prop + "' value='" + genes[prop] + "' /><br />";
    }
    $id(id).innerHTML = ss;
}
function populateWorldForm(id) {
    var settings = new Settings();
    var ss = "<h2>World Settings</h2>";
    for (var _i = 0, _a = Object.getOwnPropertyNames(settings); _i < _a.length; _i++) {
        var p = _a[_i];
        if ((typeof settings[p]) == 'number') {
            ss += "<span class='label'>" + toWords(p) + "</span><input type='text' id='" + p + "' value='" + settings[p] + "' /><br />";
        }
        else {
            ss += "<label class='label' for='" + p + "'>" + toWords(p) + "</label><input type=checkbox id='" + p + "' name='" + p + "' " + (settings[p] ? 'checked=checked' : '') + " /><br />";
        }
    }
    $id(id).innerHTML = ss;
}
function readGeneForm(id) {
    var ss = "";
    var genes = getDefaultGenes();
    //Updates the default genes!
    for (var _i = 0, _a = Object.getOwnPropertyNames(genes); _i < _a.length; _i++) {
        var prop = _a[_i];
        genes[prop] = parseFloat($id(prop).value);
        ss += "_defaultGenes[" + prop + "] = parseFloat((<HTMLInputElement>$id('" + prop + "')).value); //" + parseFloat($id(prop).value) + "\r\n";
    }
    console.log(ss);
}
function readWorldForm(id) {
    var ss = "";
    var settings = world.Settings;
    for (var _i = 0, _a = Object.getOwnPropertyNames(settings); _i < _a.length; _i++) {
        var p = _a[_i];
        if ((typeof settings[p]) == 'number') {
            settings[p] = parseFloat($id(p).value);
        }
        else {
            //boolean
            settings[p] = $id(p).checked;
        }
    }
    console.log(JSON.stringify(settings));
}
var mouseDown = false;
document.addEventListener("DOMContentLoaded", function () {
    populateGeneForm('geneForm');
    populateWorldForm('worldForm');
    $id('go').addEventListener('click', function () {
        readGeneForm('geneForm');
        removeClass('.startHidden', 'startHidden');
        $id('stats').classList.add('hidden');
        //showHideStats($id('showHideStats'));
        canvas = document.getElementById("html-canvas");
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
        canvas.addEventListener('mousedown', function (e) {
            //if (paused) return;
            mouseDown = true;
            placeWall(canvas, e, true);
        }, false);
        canvas.addEventListener('mouseup', function (e) {
            //if (paused) return;
            mouseDown = false;
            //getCursorPosition(canvas, e);
        }, false);
        canvas.addEventListener('mousemove', function (e) {
            if (mouseDown) {
                placeWall(canvas, e, false);
            }
        }, false);
        draw2();
    });
}, false);
function placeWall(canvas, event, toggler) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var c = world.getCellAtXY(x, y);
    console.log(x, y, c);
    if (paused) {
        mouseDown = false;
        if (toggler) {
            console.log(c);
            if (c.Animal && c.Animal.log.length > 0)
                alert(JSON.stringify(c.Animal.log, null, ' '));
            else if (c.Animal)
                alert(JSON.stringify(c.Animal, null, ' '));
            else if (c.log.length > 0)
                alert(JSON.stringify(c.log, null, ' '));
            else
                alert(JSON.stringify(c, null, ' '));
        }
        return;
    }
    if (!world.Settings.AllowWalls)
        return;
    if (!c.Wall) {
        world.InjectWall(c.Col, c.Row);
    }
    else {
        if (toggler)
            c.Wall = null;
        //
    }
}
