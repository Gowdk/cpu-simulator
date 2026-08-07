/*
    Represents the Program Counter Sequential functional block.
*/
export class ProgramCounter {
  private value = 0;

  //input
  public read(): number {
    return this.value;
  }

  // Ouput
  public write(value: number): void {
    this.value = value;
  }

  // Reset. Will be eventually changed.
  public reset(): void {
    this.value = 0;
  }
}