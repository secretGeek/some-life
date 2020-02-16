var canvas;
var ctx;
var world;
var causeOfDeathNatural = [];
var deathsToTrack = 100; //number of recent deaths to keep track of for stats reasons.
//what size of an adult is a newborn baby? (e.g. 10% of adult size, then 0.1)
//at what age are animals fullgrown?
var SEASON_LENGTH = 20;
var ALWAYS_SUMMER = false;
var SUMMER = true;
var season_day = 0; //how many days into the season are we?
var ENERGY_RATE = 3.1; // how much energy does grass receive on each tick?
var ENERGY_UPSCALE_FACTOR = 7; //how much do we scale their genetic 'maxenergy' to find their true maximum energy.
//this is a consequence of genes being limited between 0 and 100, but the practical range discovered experimentally being quite different
var SEASONS_GET_LONGER = true;
var MUTATE_1 = 100;
var MUTATE_2 = 100;
var MUTATE_DIVISOR = 20;
function draw2() {
    if (!world.Trails)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    world.Tick++;
    season_day++;
    if (season_day == SEASON_LENGTH) {
        SUMMER = !SUMMER;
        //this causes a strange seasonal change I find intriguing...
        if (SEASONS_GET_LONGER)
            SEASON_LENGTH++;
        season_day = 0;
    }
    for (var _i = 0, _a = world.Cells; _i < _a.length; _i++) {
        var cell = _a[_i];
        if (ALWAYS_SUMMER || SUMMER)
            cell.addEnergy(world.EnergyRate);
        drawCell(world, cell);
    }
    var deadHeap = [];
    for (var _b = 0, _c = world.Animals; _b < _c.length; _b++) {
        var animal = _c[_b];
        animal.takeTurn(world);
        animal.addAge(world.TickDuration);
        if (!animal.Alive && animal.DeadDuration >= animal.MaxDeadDuration) {
            deadHeap.push(animal);
        }
        else {
            drawAnimal(world, animal);
        }
    }
    for (var deadIndex in deadHeap) {
        var deady = deadHeap[deadIndex];
        var cell = world.getCell(deady.Col, deady.Row);
        cell.Animal = null;
        var index = world.Animals.indexOf(deady);
        world.Animals.splice(index, 1);
        // and it's gone!
    }
    //restock
    //while (world.Animals.length < world.StartingPopSize) {
    //    world.tryAddAnimal();
    //}
    if (world.Pop != 0) {
        showStats();
        requestAnimationFrame(draw2);
    }
}
var World = /** @class */ (function () {
    function World(columns, rows, canvasWidth, canvasHeight, startingPopSize) {
        this.Pop = -1;
        this.Tick = 0;
        this.WidthOfCell = 20;
        this.HeightOfCell = 20;
        this.Trails = false;
        this.EnergyRate = ENERGY_RATE;
        this.TickDuration = 0.1;
        //TODO: calculate cell width/height
        this.Columns = columns;
        this.Rows = rows;
        this.CanvasWidth = canvasWidth;
        this.CanvasHeight = canvasHeight;
        this.Cells = [];
        this.StartingPopSize = startingPopSize;
        this.WidthOfCell = canvasWidth / columns;
        this.HeightOfCell = this.CanvasHeight / rows;
        for (var row = 0; row < this.Rows; row++) {
            for (var col = 0; col < this.Columns; col++) {
                var cell = new Cell(col, row);
                this.Cells.push(cell);
            }
        }
        console.log("For squarer cells, keep #rows and set cols to: " + ((canvasWidth / canvasHeight) * rows));
        console.log("...or keep # cols and set rows to: " + ((canvasHeight / canvasWidth) * columns));
        this.Animals = [];
        while (this.Animals.length < this.StartingPopSize) {
            this.tryAddAnimal();
        }
    }
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
            //console.log("ALREADY an animal there!");
            return false;
        }
    };
    World.prototype.getCell = function (col, row) {
        return this.Cells[col + (row * this.Columns)];
    };
    World.prototype.getNeighborCells = function (col, row) {
        var result = [];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var offsetX = i - 1;
                var offsetY = j - 1;
                var newX = col + offsetX;
                var newY = row + offsetY;
                if (newX < 0)
                    newX = this.Columns - 1;
                if (newY < 0)
                    newY = this.Rows - 1;
                if (newX >= this.Columns)
                    newX = 0;
                if (newY >= this.Rows)
                    newY = 0;
                if (offsetX != 0 || offsetY != 0) // ignore current tile...
                 {
                    //console.log(`newX, newY: ${newX}, ${newY} -- is cell number... ${newX + (newY*this.Columns)}`)
                    var cell = this.getCell(newX, newY); //this.Cells[newX + (newY*this.Columns)];
                    if (cell.Col == newX && cell.Row == newY) {
                        //console.log("As expected...");
                    }
                    else {
                        //console.log(`Expected: col,row: ${newX}, ${newY}, found: ${cell.Col},${cell.Row}`);
                    }
                    result.push(cell);
                }
            }
        }
        return shuffle(result);
    };
    return World;
}());
//a single population? multiple pops??
var Population = /** @class */ (function () {
    function Population() {
    }
    return Population;
}());
var Cell = /** @class */ (function () {
    function Cell(col, row) {
        this.Col = col;
        this.Row = row;
        this.Energy = rando(100);
    }
    Cell.prototype.color = function () {
        //ctx.fillStyle = '#FFA500';
        //ctx.fillStyle = 'rgb(255, 165, 0)';
        return "rgba(0, " + Math.floor(this.Energy * 2.55) + ", 0, 0.7)";
    };
    Cell.prototype.addEnergy = function (amount) {
        var initialEnergy = this.Energy;
        //cannot be less than zero, cannot be greater than 100.
        this.Energy = Math.max(0, Math.min(100, this.Energy + amount));
        return (this.Energy - initialEnergy); //how much difference did it make;
        //return this.Energy - amount;
    };
    return Cell;
}());
function drawCell(world, cell) {
    //TODO: color of cell!
    //ctx.fillStyle = 'orange';
    ctx.fillStyle = cell.color();
    ctx.beginPath();
    ctx.fillRect(world.WidthOfCell * cell.Col, world.HeightOfCell * cell.Row, world.WidthOfCell, world.HeightOfCell);
    ctx.stroke();
}
var Animal = /** @class */ (function () {
    function Animal(col, row, age, initialEnergy) {
        var _a;
        this.MaxAge = 100;
        this.Alive = true;
        this.DeadDuration = 0; //if dead... how long have they been dead?
        this.MaxDeadDuration = 5; //how long does the body take to decompose
        this.Energy = 100;
        this.Col = col;
        this.Row = row;
        this.Age = age;
        this.Size = 1; //baby size
        this.Energy = initialEnergy;
        this.Id = newId();
        this.Genes = (_a = {},
            _a[gene.MatingPercent] = 3,
            _a[gene.MinMatingEnergy] = 70,
            _a[gene.EnergyToChild] = 20,
            _a[gene.MunchAmount] = 25,
            _a[gene.AgeOfMaturity] = 10,
            _a[gene.MinimumAcceptableEnergyInaMate] = 1,
            _a[gene.MaxEnergy] = 50,
            _a);
    }
    Animal.prototype.takeTurn = function (world) {
        if (!this.Alive)
            return;
        var currentTile = world.getCell(this.Col, this.Row);
        var neighbors = world.getNeighborCells(this.Col, this.Row);
        var bestNeighbor = currentTile;
        for (var _i = 0, neighbors_1 = neighbors; _i < neighbors_1.length; _i++) {
            var t = neighbors_1[_i];
            if (t.Animal == null && t.Energy > bestNeighbor.Energy) {
                bestNeighbor = t;
            }
        }
        //TODO: could have some strategy for when it's worth moving.
        // could also have some strategy for moving even when it's not worth moving.
        // (if/when i have altitude -- the energy of moving will be based on altitude as well.)
        // energy taken to move depends on our current "mass" which is our stored energy.
        var movingEnergy = (this.Energy / 40) + 3;
        if (bestNeighbor.Energy > movingEnergy) {
            currentTile.Animal = null;
            bestNeighbor.Animal = this;
            this.Col = bestNeighbor.Col;
            this.Row = bestNeighbor.Row;
            this.Energy -= movingEnergy;
            //todo: standing still takes energy too.
            if (this.Energy <= 0) {
                console.log("Died of exhaustion.");
                this.Alive = false;
                causeOfDeathNatural.push(false);
                while (causeOfDeathNatural.length > deathsToTrack)
                    causeOfDeathNatural.splice(0, 1);
                return;
            }
            else {
                //console.log("Moved");
            }
            //eat some energy...
            var munchAmount = this.Genes[gene.MunchAmount];
            if (this.Energy + munchAmount > (this.Genes[gene.MaxEnergy] * ENERGY_UPSCALE_FACTOR)) {
                // don't try to eat more than you can store!
                munchAmount = (this.Genes[gene.MaxEnergy] * ENERGY_UPSCALE_FACTOR) - this.Energy;
            }
            //and you can't eat more than the cell can give you!
            munchAmount = -1 * bestNeighbor.addEnergy(-1 * munchAmount);
            //console.log(`munch amount: ${munchAmount}`);
            this.Energy += munchAmount;
            if (this.Energy > (this.Genes[gene.MaxEnergy] * ENERGY_UPSCALE_FACTOR)) {
                console.log("I have more energy than I thought possible! munched:" + munchAmount + " new_energy:" + this.Energy + " max:" + this.Genes[gene.MaxEnergy]);
            }
        }
        else {
            //standing still...
            //how much does that cost?
            var standingStillEnergy = 3;
            this.Energy -= standingStillEnergy;
            if (this.Energy <= 0) {
                console.log("Died of exhaustion.");
                this.Alive = false;
                causeOfDeathNatural.push(false);
                while (causeOfDeathNatural.length > deathsToTrack)
                    causeOfDeathNatural.splice(0, 1);
                return;
            }
            else {
                //console.log("Moved");
            }
        }
        this.considerMating(neighbors);
    };
    Animal.prototype.considerMating = function (cells) {
        if (this.Age < this.Genes[gene.AgeOfMaturity])
            return;
        if (this.Energy < this.Genes[gene.MinMatingEnergy])
            return;
        if (this.Energy < this.Genes[gene.EnergyToChild])
            return;
        //if their mating percent is 10%... then 90% of the time they'll exit here.
        if (this.Genes[gene.MatingPercent] <= rando(100))
            return;
        //this means that 10% of the time, they are willing to consider mating.
        // whether or not they run into anyone... that's a different issue.
        var neighbors = [];
        var emptyCells = [];
        for (var _i = 0, cells_1 = cells; _i < cells_1.length; _i++) {
            var cell = cells_1[_i];
            if (cell.Animal != null) {
                // criteria to be a suitable mate:
                if (cell.Animal.Alive // picky
                    && cell.Animal.Age > cell.Animal.Genes[gene.AgeOfMaturity]
                    && cell.Animal.AdvertisedEnergy() > this.Genes[gene.MinimumAcceptableEnergyInaMate]) {
                    neighbors.push(cell.Animal);
                }
            }
            else {
                emptyCells.push(cell);
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
        //TODO: suitors have their energy, but also: how much energy they advertise.
        var potentialMate = neighbors[0];
        //TODO: perform cross over of genes;
        world.addAnimal(emptyCells[0].Col, emptyCells[0].Row, 0, this.Genes[gene.EnergyToChild]);
        var child = world.getCell(emptyCells[0].Col, emptyCells[0].Row).Animal;
        child.Genes = Crossover(this.Genes, potentialMate.Genes);
        //child.Energy = this.EnergyToChild;
        this.Energy -= this.Genes[gene.EnergyToChild];
    };
    Animal.prototype.AdvertisedEnergy = function () {
        //todo: consider displaying a different amount of energy.
        //but note that it might take energy to lie about your amount of energy.
        return this.Energy;
    };
    Animal.prototype.addAge = function (tickDuration) {
        this.Age = Math.min(this.MaxAge, this.Age + tickDuration);
        this.Size = this.Age / this.MaxAge;
        if (this.Age >= this.MaxAge) {
            this.Alive = false;
            console.log("Died of old age.");
            causeOfDeathNatural.push(true);
            while (causeOfDeathNatural.length > deathsToTrack)
                causeOfDeathNatural.splice(0, 1);
        }
        if (!this.Alive) {
            this.DeadDuration = Math.min(this.MaxDeadDuration, this.DeadDuration + tickDuration);
        }
    };
    Animal.prototype.color = function () {
        if (!this.Alive) {
            var fade = Math.max(0, 1 - (this.DeadDuration / this.MaxDeadDuration));
            var color = "rgba(20,20,20, " + fade + ")";
            //console.log(color);
            return color;
        }
        return 'rgba(12,100,200, 0.9)';
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
function start2(randomize, worldWidth, worldHeight) {
    world = new World(84, 40, worldWidth, worldHeight, 30);
}
var ss = "";
var deaths = "";
function showStats() {
    //let pop = world.Animals.length;
    //todo: average energy
    //todo: average of each gene.
    //todo: ability to expand/collapse the stats.
    var averageGenes = [0, 0, 0, 0, 0, 0, 0];
    var pop = 0;
    var averageEnergy = 0;
    for (var _i = 0, _a = world.Animals; _i < _a.length; _i++) {
        var a = _a[_i];
        if (a.Alive) {
            pop++;
            averageEnergy += a.Energy;
            if (world.Tick % 50 == 1) {
                for (var _b = 0, _c = Object.entries(a.Genes); _b < _c.length; _b++) {
                    var _d = _c[_b], key = _d[0], value = _d[1];
                    averageGenes[key] += value;
                }
            }
        }
    }
    if (world.Tick % 50 == 1) {
        ss = "";
        for (var k in averageGenes) {
            averageGenes[k] = averageGenes[k] / pop;
            ss += geneNames[k] + ": " + averageGenes[k].toFixed(3) + "<br />";
        }
        if (causeOfDeathNatural.length > 0) {
            var natural = 0;
            for (var _e = 0, causeOfDeathNatural_1 = causeOfDeathNatural; _e < causeOfDeathNatural_1.length; _e++) {
                var d = causeOfDeathNatural_1[_e];
                if (d)
                    natural++;
            }
            deaths = "deaths: " + ((natural / causeOfDeathNatural.length) * 100).toFixed(2) + "% natural";
        }
    }
    world.Pop = pop;
    var season = "winter";
    if (ALWAYS_SUMMER || SUMMER)
        season = "summer";
    if (!ALWAYS_SUMMER)
        season += " (length: " + SEASON_LENGTH + ")";
    $id('stats').innerHTML = "pop: " + pop + "<br/>tick: " + world.Tick + "<br/>world.EnergyRate: " + world.EnergyRate.toFixed(3) + "<br/>season: " + season + "<br/>" + deaths + "<br />avg energy: " + (averageEnergy / pop).toFixed(2) + "<br />" + ss;
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
/* end utility */
/* gene types */
function Crossover(parent1Genes, parent2Genes) {
    var _a;
    //todo: return genes;
    var newGenes = (_a = {},
        _a[gene.MatingPercent] = CombineGene(parent1Genes[gene.MatingPercent], parent2Genes[gene.MatingPercent]),
        _a[gene.MinMatingEnergy] = CombineGene(parent1Genes[gene.MinMatingEnergy], parent2Genes[gene.MinMatingEnergy]),
        _a[gene.EnergyToChild] = CombineGene(parent1Genes[gene.EnergyToChild], parent2Genes[gene.EnergyToChild]),
        _a[gene.MunchAmount] = CombineGene(parent1Genes[gene.MunchAmount], parent2Genes[gene.MunchAmount]),
        _a[gene.AgeOfMaturity] = CombineGene(parent1Genes[gene.AgeOfMaturity], parent2Genes[gene.AgeOfMaturity]),
        _a[gene.MinimumAcceptableEnergyInaMate] = CombineGene(parent1Genes[gene.MinimumAcceptableEnergyInaMate], parent2Genes[gene.MinimumAcceptableEnergyInaMate]),
        _a[gene.MaxEnergy] = CombineGene(parent1Genes[gene.MaxEnergy], parent2Genes[gene.MaxEnergy]),
        _a);
    return newGenes;
}
var geneNames = ["MatingPercent", "MinMatingEnergy", "EnergyToChild", "MunchAmount", "AgeOfMaturity", "MinimumAcceptableEnergyInaMate", "MaxEnergy"];
function CombineGene(gene1, gene2) {
    var result = gene1;
    var coin = rando(100);
    if (coin < 50)
        result = gene2;
    var mutate = Math.min(rando(MUTATE_1), rando(MUTATE_2));
    coin = rando(100);
    if (coin < 50)
        mutate *= -1;
    mutate = mutate / MUTATE_DIVISOR;
    result += mutate;
    if (result > 100)
        result = 100;
    if (result < 0)
        result = 0;
    return result;
}
var gene;
(function (gene) {
    gene[gene["MatingPercent"] = 0] = "MatingPercent";
    gene[gene["MinMatingEnergy"] = 1] = "MinMatingEnergy";
    gene[gene["EnergyToChild"] = 2] = "EnergyToChild";
    gene[gene["MunchAmount"] = 3] = "MunchAmount";
    gene[gene["AgeOfMaturity"] = 4] = "AgeOfMaturity";
    gene[gene["MinimumAcceptableEnergyInaMate"] = 5] = "MinimumAcceptableEnergyInaMate";
    gene[gene["MaxEnergy"] = 6] = "MaxEnergy"; //the maximum amount of energy this creature will ever have.
})(gene || (gene = {}));
;
/* end gene types */
document.addEventListener("DOMContentLoaded", function () {
    canvas = document.getElementById("html-canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx = canvas.getContext("2d");
    canvas.addEventListener('click', function () {
        world.getNeighborCells(5, 5);
    }, false);
    $id('up').addEventListener('click', function () {
        //alert('up');
        world.EnergyRate = world.EnergyRate * 1.05;
    }, false);
    $id('down').addEventListener('click', function () {
        //alert('up');
        world.EnergyRate = world.EnergyRate * 0.96;
    }, false);
    start2(true, canvas.width, canvas.height);
    draw2();
}, false);
