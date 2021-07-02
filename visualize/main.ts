import data1 from "../solutions/1.json";
import data2 from "../solutions/2.json";
import data3 from "../solutions/3.json";
import data4 from "../solutions/4.json";

const data = [null, data1, data2, data3, data4];

function drawStep(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  stepIndex: number,
  num: number
) {
  ctx.clearRect(0, 0, 322, 322);
  ctx.drawImage(image, 0, 0);
  ctx.fillStyle = "green";
  ctx.fillRect(
    data[num].solution[stepIndex].x * 16 + 4,
    data[num].solution[stepIndex].y * 16 + 4,
    10,
    10
  );

  document.getElementById(
    `step-counter${num}`
  ).innerHTML = `Step: ${stepIndex}`;
}

function drawCanvas(num: number) {
  const canvas = document.getElementById(`canvas${num}`) as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  const image = document.getElementById(`image${num}`) as HTMLImageElement;

  let stepIndex = 0;

  const interval = setInterval(() => {
    if (stepIndex >= data[num].solution.length) return clearInterval(interval);
    drawStep(ctx, image, stepIndex, num);
    stepIndex++;
  }, 10);
}

function main() {
  drawCanvas(1);
  drawCanvas(2);
  drawCanvas(3);
  drawCanvas(4);
}

main();
