export class DataMemory {
  // Memory is just a bunch of words (4-bytes)
  private readonly words = new Map<number, number>();

  // Obtain the value at Mem[address]
  public read(address: number): number {
    this.validateAddress(address);

    return this.words.get(address) ?? 0;
  }

  // Mem[address] = value
  public write(address: number, value: number): void {
    this.validateAddress(address);

    this.words.set(address, value);
  }

  // Clear memory (for testing)
  public reset(): void {
    this.words.clear();
  }

  private validateAddress(address: number): void {
    // Must be an integer
    if (!Number.isInteger(address)) {
      throw new Error(
        `Memory address must be an integer: ${address}`,
      );
    }

    // 4-byte addressed
    if (address % 4 !== 0) {
      throw new Error(
        `Unaligned word address: ${address}`,
      );
    }
  }
}