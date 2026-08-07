export class RegisterFile {
  private readonly registers = new Int32Array(32);

  public read(index: number): number {
    this.validateIndex(index);

    return this.registers[index];
  }

  public write(
    index: number,
    value: number,
  ): void {
    this.validateIndex(index);

    // MIPS $zero cannot be modified.
    if (index === 0) {
      return;
    }

    this.registers[index] = value;
  }

  public reset(): void {
    this.registers.fill(0);
  }

  private validateIndex(index: number): void {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= 32
    ) {
      throw new Error(
        `Invalid register index: ${index}`,
      );
    }
  }
}