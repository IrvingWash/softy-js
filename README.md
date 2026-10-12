# SoftyJS

SoftyJS is a port of softy, a software 3D renderer, from Jai to TypeScript.
The port, as the original project, is written completely by hand.

It uses HTML Canvas only as a surface to put pixels into. None of the canvas drawing methods are called.
All the pixels are rasterized into an array and after copied into the canvas using `putImage`.

All the rasterizing math is done by hand.

Currently it can:
- Draw filled rectangles
