# Some-Life

[**TRY THE LIVE DEMO**](https://secretgeek.github.io/some-life/)

[![screenshot showing a single open field with a lot of colored dots](screenshot0.png)](https://secretgeek.github.io/some-life/)


This is a simulation of evolving life.

(*Tech note:* it is vanilla typescript compiled to javascript. The graphics use a html canvas)

Here is the general idea, and then I'll give general future plans before going deep into the specifics.

## The General Idea

There is a grid of little squares, and each grid contains grass. The grass keeps growing at a steady rate.

There are animals wandering around on the grass. Each animal takes turn moving. Here's what an animal does in 1 turn.

It looks at all the grass around it, and moves to the best piece of grass. Then it munches the grass.

Then it looks around and if it sees a good candidate mate, then it may produce a baby. The baby is allocated the best available empty square.

The baby will have genes from each parent, roughly 50% from each.

The genes control every specific detail of the animal's behavior. There are about 13 genes at the moment, but as the code grows I'll code up more genes.

## General future plans

I'd like to use it to test more ideas. For example, all the animals are herbivorous at the moment. But they could have genes that allows them to eat other animals. And to scavenge dead animals. It might not sound very exciting when you read about it, but it can lead to a lot of different behavior.

If the animals have more situational awareness they may be able to perform more complex strategies, based on their genes. I want to explore various strategies to see if any "[Evolutionarily Stable Strategies](https://en.wikipedia.org/wiki/Evolutionarily_stable_strategy)" emerge.

I would also like to add some graphing capabilities and more visualization capabilities.

## Specifics about this implementation.


On the opening screen you can configure two types of things:

1. "World Settings" -- Which control the way this little world works
2. "Default (starting) gene values" -- which list the genes and let you set the valus for the initial population. Where they end up after that will depend on evolution itself.


### World Settings

The World Settings are:

  - [Initial Population Size](#initial-population-size)
  - [Initial Columns](#initial-columns)
  - [Initial Rows](#initial-rows)
  - [Is Always Summer](#is-always-summer)
  - [Initial Season Length](#initial-season-length)
  - [Do Seasons Get Longer](#do-seasons-get-longer)
  - [Max Season Length](#max-season-length)
  - [Max Age](#max-age)
  - [Max Dead Duration](#max-dead-duration)
  - [Energy Rate](#energy-rate)
  - [Standing Still Energy](#standing-still-energy)
  - [Consider Violence](#consider-violence)
  - [Tick Duration](#tick-duration)
  - [Energy Upscale Factor](#energy-upscale-factor)
  - [Baby Size](#baby-size)
  - [Mutate1](#mutate1)
  - [Mutate2](#mutate2)
  - [Mutate Divisor](#mutate-divisor)
  - [Allow Walls](#allow-walls)
  - [Draw Box Walls](#draw-box-walls)
  - [Draw Corridor](#draw-corridor)
  - [Box Wall Size](#box-wall-size)
  - [Delay](#delay)
  - [Verbose Log](#verbose-log)



#### Initial Population Size

How many animals should we create.

#### Initial Columns

How many cells wide will the world be. (Note we stretch the cellsto fill the whole screen)

#### Initial Rows

How many cells tall will the world be.

(We write a message to the browser's console, to suggest an ideal number of rows, given the number of columns you chose, if you wish to create square-looking cells)

#### Is Always Summer?

Instead of having the grass constantly grow, you can turn this option off, and have two seasons: summer and winter. During summer, the grass grows at a steady rate, during winter: the grass stops growing.

#### Initial Season Length

If it is not always summer then this number sets the length of summer, in ticks. (And summer and winter are the same length)

#### Do Seasons Get Longer?

Turn this on and seasons will get 1 tick longer each time they occur. This is a fun way to steadily increase the amount of *stress* on the population; watch their numbers fall during winter.

#### Max Season Length

If you specify a max season length, then seasons will stop getting longer when they reach this length.

#### Tick Duration

While we measure seasons in ticks, we measure some things in 'years'. "Tick duration" tells you how many years long is one tick.

The default "tick duration" is `0.1`, so a year is 10 ticks long.

#### Max Age

How old, approximately, can animals live, in years?

The default is 100 years, and since the default "tick duration" is 0.1, this means an animal will live approximately 1000 ticks. In practice, we apply some randomness so that each animal's maximum age is between 80% and 120% of the *official* "max age". This randomness prevents entire groups of animals dying simultaneously, after a boom in the population.

#### Max Dead Duration

When an animal dies, how long does the body "hang around" (in years) before it dissappears. This is to allow for future plans with scavenging etc.

#### Energy Rate

How fast does the grass grow (in summer)? How many units of energy do we add to each square of grass on every tick.

####  Standing Still Energy

If an animal doesn't move it will still burn up energy. How much energy will it burn up on a single tick, if it doesn't move.

#### Consider Violence?

Should animals consider threatening other animals to scare them into moving off a piece of grass? If turned on, this activates a few genes specific to threaten/retreat strategies.

See:

  - [Not Afraid](#not-afraid)
  - [Punchy](#punchy)
  - [Threat Energy](#threat-energy)

I'm not satisfied with this design and hope to come up with some more interesting variations.

#### Energy Upscale Factor

All genes are values between `1` and `100`. This makes dealing with genes en-masse particularly easy. However, to make the numbers work, we sometimes need to apply a scaling factor to convert into a range that suits our world. "Energy Upscale Factor" is such a number. How it works is this.

There is a gene called "Max Energy" which determines the maximum amount of energy an animal is able to "carry". (Energy is a bit like mass and the more you carry, the more energy it takes to get around, so more is not always better). Although the gene must be stored as a a number between 1 and 100, we can specify a factor to multiply this by, when determining the *actual* maximum energy in the game. For example if you said the world had an "Energy Upscale Factor" of `7`, then the true maximum energy a creature could evolve would be `700`.



#### Baby Size

How little should babies appear to be, as a fraction between 0 (a speck) and 1 (full size)?

Animals are drawn as circles. If a full size circle has a radius of "1" unit, then how little should babies be? This is only a cosmetic figure, but try telling that to new parents.


#### Mutate1

This is a value that controls how much mutation occurs. A small number would mean "less mutation".

#### Mutate2

This is a second value that controls how much mutation occurs. A small number would mean "less mutation".

#### Mutate Divisor


This is a third value that controls how much mutation occurs. A big number would mean "less mutation".

Currently, the amount of mutation works like this.

How much should I mutate this gene?

- Pick a random number, `r1`,  between `0` and `Mutate1`.
- Pick anoter random number, `r2`,  between `0` and `Mutate2`.
- Pick whichever is smaller, `r1` or `r2`, giving us a result, `r`.
- Divide `r` by the `MutateDivisor` this gives us a value `M`.
- Flip a coin, if it's heads then multiply `M` by `-1`, to produce our final value for `M`.
- Add `M` to the gene value, but constrain it to remain between 0 and 100.

It's a slightly odd way to get a number. It will probably change. Inspect the function `CombineGene` to see if it's still like that.


#### Allow Walls

Do you want the viewer to be able to draw walls in this world?

Walls are an interesting feature and prevent different areas of the board from interacting. I think being able to place walls would make chess kind of interesting.

When you place a wall it kills whatever animal was there. You will see the red blob it leaves behind.

Walls are completely impenetrable to animals. One day there may be an option to let animals break through walls, or leap them. Walls have a height, but height doesn't impact game play at all currently.


#### Draw Box Walls?


![screenshot showing little fields divided by walls](screenshot2.png)


If you have chosen to allow walls then you can also pick either (or neither) of two pre-designed wall configurations. The first one is "Box Walls" This means you'd like walls to be placed which divide the whole board into small square fields. Imagine a series of paddocks, with no gates between them. It effectively means you can run many evolutions in parallel.

#### Box Wall Size

If you choose "Draw Box Walls" you also get to decide how many squares wide (and tall) each little field should be.

#### Draw Corridor?

Instead of drawing box walls you might go for "Draw Corridor".

This is a wall configuration that turns the entire field into one very long, twisty corridor, a single cell wide. No one can get past anyone else. It's an interesting layout to observe.

#### Delay (milliseconds)

Should we draw the world as quickly as possible (which is the default) or should there be a delay between each turn, giving the spectator a chance to drink in the scenery? If you specify, for example, 3000, then there will be a 3 second delay before we start to redraw the next tick.

#### Verbose Log

Do you want animals to keep a diary of what has happened to them in their life?

When the player pauses the game, if they click on an animal this log will be visible in the browser's console. (And a preview is shown in an alert.) The log records everything that increased or decreased an animal's energy, and is surprisingly informative. It also records when and how they died (where applicable).

Definitely turn off the verbose log if you want the game to run for a while.


### Genes

Here are the current set of genes in some-life.

  - [Mating Percent](#mating-percent)
  - [Min Mating Energy](#min-mating-energy)
  - [Energy To Child](#energy-to-child)
  - [Munch Amount](#munch-amount)
  - [Age Of Maturity](#age-of-maturity)
  - [Minimum Acceptable Energy In Your Mate](#minimum-acceptable-energy-in-your-mate)
  - [Max Energy](#max-energy)
  - [Not Afraid](#not-afraid)
  - [Punchy](#punchy)
  - [Threat Energy](#threat-energy)
  - [Hugh](#hugh)
  - [Saturation](#saturation)
  - [Lightness](#lightness)


#### Mating Percent

When you bump into another animal, what percent of the time are you even willing to entertain the possibility of considering mating?

#### Min Mating Energy

If you have less energy than this, you won't consider mating.


#### Energy To Child

When you (the mother) have a child, how much of your energy will you give it initially?

This is a fixed amount of energy, not a fraction of your energy.




#### Munch Amount

When you are standing on some grass, how much will you eat in one go?


#### Age Of Maturity

At what age are you old enough to consider mating.


#### Minimum Acceptable Energy In Your Mate


What is the minimum amount of energy you would consider adequate in the potential father of your child?


#### Max Energy

What is the maximum amount of energy you can "carry"



#### Not Afraid

This gene and the next two genes, [Punchy](#punchy) and [Threat Energy](#threat-energy) work together.

If "consider violence" is turned off in the world settings, then these genes have no effect and will just drift.


#### Punchy

see above and below.

#### Threat Energy

Here is how the three violent genes work together:

- Punchy: In a violent world, we will consider threatening anyone with less energy than this threshold.
- ThreatEnergy: if we threaten someone, this is the amount of energy we'll put into a threat display.

If the person who is threatened moves away, then we will take their spot. But if they don't move, we will follow through on our threat and hit them. This will cost us `ThreatEnergy/2` units of energy. But it will inflict `ThreatEnergy*2` units on the target of our bullying.

Whether or not they move away or stand their ground depends on the `NotAfraid` gene's value.

If someone threatens us with a threaten energy equal of less to our `NotAfraid` gene's value, then we will stand our ground.

There is one other situation to cover: if we are threatened, but there is nowhere for us to go, we will politely and honestly tell the bully there is no where for us to move to, and they will leave the matter there.

This part of the game could be improved or replaced with other strategies. It's just a first iteration of the idea.



#### Hugh

Hugh is a gene that does not affect the game itself. It is free to drift. It is used for the color that is rendered. (It is multipled by 2.55, so that it is scaled to be a number from 0 to 255).



#### Saturation

Saturation is free to drift, like "hugh", and is used for the rendering of the animal.


#### Lightness

Lightness is free to drift, like "hugh" and "saturation", and is used for the rendering of the animal.




## Notes


### Colors

When an animal dies of old age it flashes purple for a while (governed by 'MaxDeadDuration/TickDuration`) until it fades away.

If an animal dies from starvation or violence, it turns bright red instead of purple, before fading away.

If one animal assaults another then the victim will flash bright blue for 5 ticks.

(Perhaps we should also show the aggressor?)


## Genes and crossover

Each animal has only one copy of its genes, thus they are "haploid".

(This is different to humans for example, who generally have two copies of each DNA sequence, in what is called "diploid" formation, common to most eukaryotes.)

A haploid configuration seems to be adequate for most genetic algorithms and simulations that are not specifically aimed at modelling higher levels of "ploidy". It takes away the need to include "dominance" in every gene, and generally simplifies things.

In this game each gene is equally likely to come from either parent. This is also different to life on earth, where adjacent DNA is likely to come from the same parent, up until a "crossover" event at which point DNA sequences will then be from the other parent. (It is currently estimated that there are between 1 and 2 crossover events per chromosome, in humans). Crossover is often used in simulated life, and could be useful here, particularly where behavior arises from more than one gene. If we would like some adjacent genes to "travel together" across generations, then crossover would be better than randomly picking a gene from either parent.

# Blended phenotypes

When discussing diploid genes we usually use Mendel's model, where there are two genes in a genotype, only the "dominant" one is activated; this is the "phenotype". But there is also a concept called "incomplete dominance" where both genes may be active, resulting in (well, resulting in pretty much anything imaginable, but for simplicity we say it results in) a mixture of the expected result from each gene.

![incomplete dominance can result in a blended result](/incomplete_dominance.png)

In the diagram above I've used Comic Sans MS font, to indicate that this "blending" is probably a drastic over-simplification of what really occurs in 'incomplete dominance' scenarios.

Whether this is biologically accurate or not, it's certainly an easy type of inheritance to implement in the current model. Because every gene is represented as a number between 1 and 100, I can just average the two numbers to produce a result. This option can be enabled by a "blended inheritance" world setting.

([Further reading on incomplete dominance](https://www.khanacademy.org/science/high-school-biology/hs-classical-genetics/hs-non-mendelian-inheritance/a/multiple-alleles-incomplete-dominance-and-codominance))


## [play the game now, live](https://secretgeek.github.io/some-life/)

