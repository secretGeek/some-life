# Some-Life

This is a simulation that has evolving digital life forms. 

(*Tech note:* it is written in vanilla typescript and compiled to javascript. The graphics are displayed using a html canvas)

Here is the general idea, and then I've give general future plans before going deep into the specifics.

## The General Idea

There is a grid of little squares, and each grid contains grass. The grass keeps growing at a steady rate.

There are animals wandering around on the grass. Each animal takes turn moving. Here's what an animal does in 1 turn.

It looks at all the grass around it, and possibly moves to the best piece of grass. Then it munches the grass.

Then it looks around and if it sees a good candidate mate, then it may produce a baby. The baby will be placed on the best available empty square.

The baby will have genes from each parent, roughly 50% from each.

The genes control every specific detail of the animal's behavior. There are about 13 genes at the moment, but as the code grows more genes will be added.

## General future plans

I'd like to use it to test more ideas. For example all of the animals are herbivorous at the moment. But I think they could have genes that allows them to eat other animals. And to scavenge dead animals. It might not sound very exciting when you just read about it, but it can lead to a lot of different behavior. 

If the animals have more situational awareness they may be able to perform more complex strategies, and these could also be determined by genes. I want to explore various strategies to see if any "[Evolutionarily Stable Strategies](https://en.wikipedia.org/wiki/Evolutionarily_stable_strategy)" emerge.

I would also like to add some graphing capabilities and more visualization capabilities.

## Specifics about this implementation.


On the opening screen you can configure two types of things:

1. "World Settings" -- Which control the way this little world works
2. "Default (starting) gene values" -- which list the genes and let you set the valus for the initial population. Where they end up after that will depend on evolution itself.



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



## Initial Population Size

How many animals should be created.

## Initial Columns

How many cells wide will the world be. (Note cells will be stretched to fill the whole screen)

## Initial Rows

How many cells tall will the world be.

(Note that a message will be written to the browsers console to tell you what an ideal number of rows would be, given the number of columns you chose, if you wish to have square-looking cells)

## Is Always Summer?

Instead of having the grass constantly grow, you can turn this option off, and have two seasons: summer and winter. During summer, the grass grows steadily, during winter: the grass stops growing. 

## Initial Season Length

If it is not always summer then this number is used for the length of summer. (And summer and winter are the same length)

## Do Seasons Get Longer?

Turn this on and seasons will get 1 tick longer each time they occur. This is a fun way to steadily increase the amount of stress on the population, watch their numbers fall during winter. 

## Max Season Length

If you specify a max season length, then seasons will stop getting longer when they reach this length.

## Tick Duration

While seasons are measured in ticks, some other things are measured in 'years'. "Tick duration" tells you how many years long is one tick.

## Max Age

How old, approximately, can animals live, in years. The default is 100 years, and since the default tick duration is 0.1, this means an animal will live approximately 1000 ticks. In practice, some randomness is applied so that each animals maximum age is between 80% and 120% of the official max age. This randomness prevents entire groups of animals dying simultaneously, after a boom in the population.

## Max Dead Duration

When an animal dies, how long does the body "hang around" (in years) before it dissappears. This is to allow for future plans with scavenging etc.

## Energy Rate

How fast does the grass grow (in summer)? How many units of energy are added to each square of grass on every tick.

##  Standing Still Energy

If an animal doesn't move it will still burn up energy. How much energy will it burn up on a single tick, if it doesn't move.

## Consider Violence? 

Should animals be willing to consider threatening other animals to scare them into moving off a piece of grass? If turned on, this activates a few genes specific to threaten/retreat strategies.



## Energy Upscale Factor

All genes are values between `1` and `100`. This makes dealing with genes en-masse particularly easy. However, to make the numbers work, a scaling factor might need to be applied when dealing with the world the animals are in. Energy Upscale Factor is just such a number. How it works is this.

There is a gene called "Max Energy" which determines the maximum amount of energy an animal is able to "carry". (Energy is bit like mass and the more you carry, the more energy it takes to get around). Although the gene must express a number between 1 and 100, you can specify a factor to multiply this by, when determining the actual maximum energy. For example if you said the world had an "Energy Upscale Factor" of `7`, then the true maximum energy a creature could evolve would be `700`.



## Baby Size

How little should babies appear to be, as a fraction between 0 (a speck) and 1 (full size).

Animals are drawn as circles. If a full size circle has a radius of "1" unit, then how little should babies be? This is only a cosmetic figure, but try telling that to new parents.


## Mutate1

This is a value that controls how much mutation occurs. A small number would mean "less mutation".

## Mutate2

This is a second value that controls how much mutation occurs. A small number would mean "less mutation".

## Mutate Divisor


This is a third value that controls how much mutation occurs. A big number would mean "less mutation".

Currently, the chances of mutation work like this. 

How much should I mutate this gene?

Pick a random number, `r1`,  between `0` and `Mutate1`. 
Pick anoter random number, `r2`,  between `0` and `Mutate2`. 
Pick whichever is smaller, `r1` or `r2`, giving us a result, `r`.
Divid `r` by the `MutateDivisor` this gives us a value `M`.
Flip a coin, if it's heads then multiply `M` by `-1`, to produce our final value for `M`.
Add `M` to the gene value, but constrain it to remain between 0 and 100.


It's a slightly odd way to get a number. It will probably change. Inspect the function `CombineGene` to see if it's still like that.


## Allow Walls

Do you want to be able to draw walls in this world?

Walls are an interesting feature and prevent different areas of the board from interacting. I think being able to place walls would make chess kind of interesting.


## Draw Box Walls?

If you have chosen to allow walls then you can also pick either (or neither) of two pre-designed wall configurations. The first one is "Box Walls" This means you'd like walls to be placed which divide the whole board into small square fields. Imagine a series of paddocks, with no gates between them. It effectively means you can run many evolutions in parallel.

## Box Wall Size

If you choose "Draw Box Walls" you also get to decide how many squares will each little field should be.

## Draw Corridor?

Instead of drawing box walls you might go for "Draw Corridor".

THis is a wall configuration that turns the entire field into one very long, twisty corridor, one cell wide. No one can get past anyone else. It's an interesting layout to observe.

## Delay (milliseconds)

Should the world be drawn as quickly as possible (which is the default) or should there be a delay between each turn, giving the spectactor a chance to drink in the scenery? If you specify, for example, 3000, then there will be a 3 second between each turn being drawn.

## Verbose Log

Do you want animals to keep a diary of what has happened to them in their life?

When the game is paused, if you click on an animal this log will be visible in the browser's console. (And a preview of it will be displayed on screen.)

Definitely turn off the log if you want the game to run for a while.




## Genes


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


## Mating Percent

## Min Mating Energy

## Energy To Child

## Munch Amount

## Age Of Maturity

## Minimum Acceptable Energy In Your Mate

## Max Energy

## Not Afraid

## Punchy

## Threat Energy

## Hugh

## Saturation

## Lightness
