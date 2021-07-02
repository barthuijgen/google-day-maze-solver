import path from "path";
import * as fs from "fs/promises";
import getPixels from "get-pixels";
import { NdArray } from "ndarray";

interface Pixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Block {
  north: Color;
  east: Color;
  south: Color;
  west: Color;
  center: Color;
}

interface Position {
  x: number;
  y: number;
}

type Grid = Block[][];

type Direction = "north" | "east" | "south" | "west";

enum Color {
  Other,
  White,
  Black,
  Red,
  Blue,
}

const getPixelsAsync = (file: string): Promise<NdArray> =>
  new Promise((resolve, reject) =>
    getPixels(file, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    })
  );

const isPixelWhite = (pixel: Pixel) =>
  pixel.r === 255 && pixel.g === 255 && pixel.b === 255;
const isPixelBlack = (pixel: Pixel) =>
  pixel.r === 0 && pixel.g === 0 && pixel.b === 0;
const isPixelRed = (pixel: Pixel) =>
  pixel.r === 255 && pixel.g === 0 && pixel.b === 0;
const isPixelBlue = (pixel: Pixel) =>
  pixel.r === 0 && pixel.g === 0 && pixel.b === 255;

const pixelToColor = (pixel: Pixel) => {
  if (isPixelWhite(pixel)) return Color.White;
  else if (isPixelBlack(pixel)) return Color.Black;
  else if (isPixelRed(pixel)) return Color.Red;
  else if (isPixelBlue(pixel)) return Color.Blue;
  else return Color.Other;
};

async function parseImage(image: string) {
  const pixels = await getPixelsAsync(image);

  const [width, height] = pixels.shape;

  if (width !== 322 || height !== 322) throw Error("Wrong image dimentions");

  const gridSize = 16;
  const gridOffset = 1;
  const gridCount = Math.round(width / gridSize);

  // convert 1d array to 2d array
  const pixels2d: any[][] = [];

  for (let y = gridOffset; y < height - gridOffset; y++) {
    pixels2d.push([]);
    for (let x = gridOffset; x < width - gridOffset; x++) {
      const i = (x + y * 322) * 4;
      const pixel = {
        r: pixels.data[i],
        g: pixels.data[i + 1],
        b: pixels.data[i + 2],
        a: pixels.data[i + 3],
      };
      pixels2d[pixels2d.length - 1].push(pixel);
    }
  }

  const grid: Block[][] = [];
  let start!: { x: number; y: number };
  let end!: { x: number; y: number };

  for (let y = 0; y < gridCount; y++) {
    grid[y] = [];
    for (let x = 0; x < gridCount; x++) {
      const blockY = y * gridSize;
      const blockX = x * gridSize;
      const block: Partial<Block> = {};

      block.north = pixelToColor(pixels2d[blockY][blockX + 8]);
      block.west = pixelToColor(pixels2d[blockY + 8][blockX]);
      block.south = pixelToColor(pixels2d[blockY + 15][blockX + 8]);
      block.east = pixelToColor(pixels2d[blockY + 8][blockX + 15]);
      block.center = pixelToColor(pixels2d[blockY + 8][blockX + 8]);
      if (block.center === Color.Blue) start = { x, y };
      if (block.center === Color.Red) end = { x, y };

      grid[y][x] = block as Block;
    }
  }
  return { grid, start, end };
}

class MazeSolver {
  currentPosition: Position;
  direction: Direction = "east";
  stepsTaken: Position[] = [];
  marked: number[][] = [];

  constructor(private grid: Grid, start: Position, private end: Position) {
    this.currentPosition = start;
    this.setMarked(this.currentPosition);
  }

  setMarked(pos: Position) {
    if (!this.marked[pos.y]) this.marked[pos.y] = [];
    this.marked[pos.y][pos.x] = 1;
  }

  isMarked(pos: Position) {
    return this.marked[pos.y][pos.x] === 1 ?? false;
  }

  turnRight() {
    if (this.direction === "north") {
      this.direction = "east";
    } else if (this.direction === "east") {
      this.direction = "south";
    } else if (this.direction === "south") {
      this.direction = "west";
    } else if (this.direction === "west") {
      this.direction = "north";
    }
  }

  turnLeft() {
    if (this.direction === "north") {
      this.direction = "west";
    } else if (this.direction === "east") {
      this.direction = "north";
    } else if (this.direction === "south") {
      this.direction = "east";
    } else if (this.direction === "west") {
      this.direction = "south";
    }
  }

  currentBlock() {
    return this.grid[this.currentPosition.y][this.currentPosition.x];
  }

  getDirectionPosition(): Position {
    if (this.direction == "north") return this.northPosition();
    else if (this.direction == "east") return this.eastPosition();
    else if (this.direction == "south") return this.southPosition();
    else if (this.direction == "west") return this.westPosition();
    throw Error("Direction invalid");
  }

  getToTheRightPosition(): Position {
    if (this.direction == "north") return this.eastPosition();
    else if (this.direction == "east") return this.southPosition();
    else if (this.direction == "south") return this.westPosition();
    else if (this.direction == "west") return this.northPosition();
    throw Error("Direction invalid");
  }

  northPosition(): Position {
    return { x: this.currentPosition.x, y: this.currentPosition.y - 1 };
  }
  eastPosition(): Position {
    return { x: this.currentPosition.x + 1, y: this.currentPosition.y };
  }
  southPosition(): Position {
    return { x: this.currentPosition.x, y: this.currentPosition.y + 1 };
  }
  westPosition(): Position {
    return { x: this.currentPosition.x - 1, y: this.currentPosition.y };
  }

  canMoveTo(pos: Position): boolean {
    const block = this.currentBlock();
    if (this.positionEquals(this.northPosition(), pos)) {
      return block.north === Color.White;
    }
    if (this.positionEquals(this.eastPosition(), pos)) {
      return block.east === Color.White;
    }
    if (this.positionEquals(this.southPosition(), pos)) {
      return block.south === Color.White;
    }
    if (this.positionEquals(this.westPosition(), pos)) {
      return block.west === Color.White;
    }
    return false;
  }

  moveTo(pos: Position) {
    this.currentPosition = pos;
    this.stepsTaken.push(pos);
    this.setMarked(pos);
  }

  positionEquals(pos1: Position, pos2: Position) {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  step() {
    const toTheRightPos = this.getToTheRightPosition();
    const straightPos = this.getDirectionPosition();
    if (this.canMoveTo(toTheRightPos)) {
      this.turnRight();
      this.moveTo(toTheRightPos);
    } else if (this.canMoveTo(straightPos)) {
      this.moveTo(straightPos);
    } else {
      this.turnLeft();
    }
  }

  solve() {
    let iterations = 0;

    while (!this.positionEquals(this.currentPosition, this.end)) {
      this.step();

      iterations++;
      if (iterations > 5000) {
        console.log("Iteration limit reached");
        break;
      }
    }

    if (this.positionEquals(this.currentPosition, this.end)) {
      console.log(`SOLUTION FOUND!!! took ${this.stepsTaken.length} steps`);
    }

    return this.stepsTaken;
  }
}

async function main() {
  const mazeNumber = 4;
  const data = await parseImage(
    path.join(__dirname, `../mazes/${mazeNumber}.png`)
  );
  console.log({ start: data.start, end: data.end });
  const solver = new MazeSolver(data.grid, data.start, data.end);
  const solution = solver.solve();

  fs.writeFile(
    path.join(__dirname, `../solutions/${mazeNumber}.json`),
    JSON.stringify(
      { grid: data.grid, start: data.start, end: data.end, solution },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.log(error);
});
