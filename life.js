var canvas;
var ctx;
var world;
var causeOfDeathNatural = [];
var deathsToTrack = 100; //number of recent deaths to keep track of for stats reasons.
// what is the display size of a baby (relative to an adult) (e.g. 10% of adult size, then 0.1)
var babySize = 0.3;
//Feature to consider:
//predation
//resource strategy...
// if someone else is on fertile land -- do you hit them...
// (and if so -- can they move away/respond as part of this turn?)
function draw2() {
    if (!world.Trails)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    world.Tick++;
    world.SeasonDay++;
    if (world.SeasonDay == world.Settings.SeasonLength) {
        world.ItIsSummer = !world.ItIsSummer;
        //this causes a strange seasonal change I find intriguing...
        if (world.Settings.DoSeasonsGetLonger)
            world.Settings.SeasonLength++;
        if (world.Settings.MaxSeasonLength > 0)
            world.Settings.SeasonLength = Math.min(world.Settings.MaxSeasonLength, world.Settings.SeasonLength);
        world.SeasonDay = 0;
    }
    for (var _i = 0, _a = world.Cells; _i < _a.length; _i++) {
        var cell = _a[_i];
        if (world.Settings.IsAlwaysSummer || world.ItIsSummer)
            cell.addEnergy(world.Settings.EnergyRate);
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
    for (var deadIndex in deadHeap) {
        var deady = deadHeap[deadIndex];
        var cell = world.getCell(deady.Col, deady.Row);
        cell.Animal = null;
        var index = world.Animals.indexOf(deady);
        world.Animals.splice(index, 1);
        // and it's gone!
    }
    if (world.Pop != 0) {
        showStats();
        if (world.Settings.Delay == 0) {
            requestAnimationFrame(draw2);
        }
        else {
            setTimeout(function () { requestAnimationFrame(draw2); }, world.Settings.Delay);
        }
    }
}
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
    World.prototype.initialize = function () {
        this.Cells = [];
        this.WidthOfCell = this.CanvasWidth / this.Settings.Columns;
        this.HeightOfCell = this.CanvasHeight / this.Settings.Rows;
        for (var row = 0; row < this.Settings.Rows; row++) {
            for (var col = 0; col < this.Settings.Columns; col++) {
                var cell = new Cell(col, row);
                this.Cells.push(cell);
            }
        }
        console.log("For squarer cells, keep #rows and set cols to: " + ((this.CanvasWidth / this.CanvasHeight) * this.Settings.Rows));
        console.log("...or keep # cols and set rows to: " + ((this.CanvasHeight / this.CanvasWidth) * this.Settings.Columns));
        this.Animals = [];
        while (this.Animals.length < this.Settings.StartingPopulationSize) {
            this.tryAddAnimal();
        }
        console.log(this);
    };
    World.prototype.tryAddAnimal = function () {
        var col = rando(this.Settings.Columns);
        var row = rando(this.Settings.Rows);
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
        return this.Cells[col + (row * this.Settings.Columns)];
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
                    newX = this.Settings.Columns + newX; //wrap...
                if (newY < 0)
                    newY = this.Settings.Rows + newY; //...around!
                if (newX >= this.Settings.Columns)
                    newX = this.Settings.Columns - newX;
                if (newY >= this.Settings.Rows)
                    newY = this.Settings.Rows - newY;
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
        this.Col = col;
        this.Row = row;
        this.Energy = rando(100);
    }
    Cell.prototype.color = function () {
        return "hsla(120, 69%, " + Math.floor((this.Energy * 0.4) + 5) + "%, 0.9)";
    };
    Cell.prototype.addEnergy = function (amount) {
        var initialEnergy = this.Energy;
        //cannot be less than zero, cannot be greater than 100.
        this.Energy = Math.max(0, Math.min(100, this.Energy + amount));
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
        this.Generation = 0;
        this.Alive = true;
        this.DeadDuration = 0; //if dead... how long have they been dead?
        this.Energy = 100;
        this.Col = col;
        this.Row = row;
        this.Age = age;
        //this.Size = 0; //baby size
        this.Energy = initialEnergy;
        this.Id = newId();
        this.Genes = getDefaultGenes();
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
                this.Alive = false;
                //console.log("Died of exhaustion.");
                causeOfDeathNatural.push(false);
                while (causeOfDeathNatural.length > deathsToTrack)
                    causeOfDeathNatural.splice(0, 1);
                return;
            }
            else {
                //console.log("Moved");
            }
            //eat some energy...
            var munchAmount = this.Genes.MunchAmount;
            if (this.Energy + munchAmount > (this.Genes.MaxEnergy * world.Settings.EnergyUpscaleFactor)) {
                // don't try to eat more than you can store!
                munchAmount = (this.Genes.MaxEnergy * world.Settings.EnergyUpscaleFactor) - this.Energy;
            }
            //and you can't eat more than the cell can give you!
            munchAmount = -1 * bestNeighbor.addEnergy(-1 * munchAmount);
            //console.log(`munch amount: ${munchAmount}`);
            this.Energy += munchAmount;
            if (this.Energy > (this.Genes.MaxEnergy * world.Settings.EnergyUpscaleFactor)) {
                console.log("I have more energy than I thought possible! munched:" + munchAmount + " new_energy:" + this.Energy + " max:" + this.Genes.MaxEnergy);
            }
        }
        else {
            //standing still...
            //how much does that cost?
            var standingStillEnergy = 3;
            this.Energy -= standingStillEnergy;
            if (this.Energy <= 0) {
                this.Alive = false;
                causeOfDeathNatural.push(false);
                while (causeOfDeathNatural.length > deathsToTrack)
                    causeOfDeathNatural.splice(0, 1);
                return;
            }
        }
        neighbors = world.getNeighborCells(this.Col, this.Row);
        this.considerMating(neighbors);
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
        for (var _i = 0, cells_1 = cells; _i < cells_1.length; _i++) {
            var cell = cells_1[_i];
            if (cell.Animal != null) {
                // criteria to be a suitable mate:
                if (cell.Animal.Alive // picky
                    && cell.Animal.Id != this.Id // avoid blindness
                    && cell.Animal.Age > cell.Animal.Genes.AgeOfMaturity
                    && cell.Animal.AdvertisedEnergy() > this.Genes.MinimumAcceptableEnergyInYourMate) {
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
        //TODO: have other strategies for ranking suitors
        //TODO: suitors have their energy, but also: how much energy they advertise.
        var potentialMate = neighbors[0];
        world.addAnimal(emptyCells[0].Col, emptyCells[0].Row, 0, this.Genes.EnergyToChild);
        var child = world.getCell(emptyCells[0].Col, emptyCells[0].Row).Animal;
        child.Generation = (this.Generation + potentialMate.Generation) / 2 + 1;
        child.Genes = Crossover(this.Genes, potentialMate.Genes);
        //child.Energy = this.EnergyToChild;
        this.Energy -= this.Genes.EnergyToChild;
    };
    Animal.prototype.AdvertisedEnergy = function () {
        //todo: consider displaying a different amount of energy.
        //but note that it might take energy to lie about your amount of energy.
        return this.Energy;
    };
    Animal.prototype.addAge = function (tickDuration) {
        this.Age = Math.min(world.Settings.MaxAge, this.Age + tickDuration);
        //babySize is a fraction, e.g. 0.3, so that babies are not a tiny spec, but start at 30% of final size.
        this.Size = babySize + ((1.0 - babySize) * (this.Age / world.Settings.MaxAge)); //from 0..1.0
        //if (this.Age >= this.MaxAge) {
        if (this.Age >= world.Settings.MaxAge) {
            this.Alive = false;
            //console.log("Died of old age.");
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
            var fade = Math.max(0, 1 - (this.DeadDuration / world.Settings.MaxDeadDuration));
            var color = "rgba(20,20,20, " + fade + ")";
            //console.log(color);
            return color;
        }
        return "hsla(" + Math.floor(this.Genes.Hugh * 3.6) + ", " + Math.floor(this.Genes.Saturation) + "%, " + Math.floor(this.Genes.Lightness * 0.6) + "%, 0.9)";
        //return 'rgba(12,100,200, 0.9)';
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
        season += " (day " + world.SeasonDay + " of " + world.Settings.SeasonLength + ")";
    $id('stats').innerHTML = "pop: " + pop + "<br/>tick: " + world.Tick + "<br/>energy rate: " + world.Settings.EnergyRate.toFixed(3) + "<br/>season: " + season + "<br/>" + deaths + "<br />avg energy: " + (averageEnergy / pop).toFixed(2) + "<br />avg gen:  " + (averageGeneration / pop).toFixed(2) + "<br />avg age:  " + (averageAge / pop).toFixed(2) + "<br />" + ss;
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
        this.MatingPercent = 3; // what percent of the time are you thinking about mating
        this.MinMatingEnergy = 70; //if less than this much energy, don't consider mating
        this.EnergyToChild = 20; // how much energy does a child start with
        this.MunchAmount = 25; //how much energy will they try to extract from the ground each chance they get
        this.AgeOfMaturity = 10; //how old do they have to be before they can mate
        this.MinimumAcceptableEnergyInYourMate = 1; //a pulse will do
        this.MaxEnergy = 50;
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
        this.StartingPopulationSize = 120;
        this.Columns = 80;
        this.Rows = 40;
        this.IsAlwaysSummer = false;
        this.SeasonLength = 20;
        this.DoSeasonsGetLonger = true;
        this.MaxSeasonLength = 220;
        this.MaxAge = 100; //How long do animals live
        this.MaxDeadDuration = 10; //How long does it take for animals bodies to break down
        // How much energy does grass receive on each tick?
        this.EnergyRate = 5.1;
        // How many 'years' go by for every tick. (age is specified in years, not ticks.)
        this.TickDuration = 0.1;
        // How much do we scale an animals genetic 'maxenergy' to find their true maximum energy.
        // This is a consequence of genes being limited between 0 and 100, but the practical range discovered experimentally being quite different
        this.EnergyUpscaleFactor = 7;
        this.Mutate1 = 100;
        this.Mutate2 = 100;
        this.MutateDivisor = 20;
        // How many milliseconds to wait between rendering each frame
        this.Delay = 0;
    }
    return Settings;
}());
/* end world parameters */
function populateGeneForm(id) {
    var genes = getDefaultGenes();
    var ss = "<h1>Default (starting) gene values</h1><br />";
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
document.addEventListener("DOMContentLoaded", function () {
    populateGeneForm('geneForm');
    populateWorldForm('worldForm');
    $id('go').addEventListener('click', function () {
        readGeneForm('geneForm');
        removeClass('.startHidden', 'startHidden');
        canvas = document.getElementById("html-canvas");
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx = canvas.getContext("2d");
        world = new World(canvas.clientWidth, canvas.clientHeight);
        readWorldForm('worldForm');
        world.initialize();
        $id('geneForm').classList.add('hidden');
        $id('worldForm').classList.add('hidden');
        $id('go').classList.add('hidden');
        /*canvas.addEventListener('click', function() {
            world.getNeighborCells(5,5);
        }, false);*/
        $id('up').addEventListener('click', function () {
            world.Settings.EnergyRate = world.Settings.EnergyRate * 1.05;
        }, false);
        $id('down').addEventListener('click', function () {
            world.Settings.EnergyRate = world.Settings.EnergyRate * 0.96;
        }, false);
        draw2();
    });
}, false);
