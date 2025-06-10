import { generateFractionalIndex } from './utils';

describe('generateFractionalIndex', () => {
  it('should generate an index between two valid fractional strings', () => {
    expect(generateFractionalIndex('1.0', '2.0')).toBe('1.5');
    expect(generateFractionalIndex('0.5', '0.75')).toBe('0.625');
    expect(generateFractionalIndex('10.0', '11.0')).toBe('10.5');
  });

  it('should generate an index when prev is null (beginning of the list)', () => {
    expect(generateFractionalIndex(null, '1.0')).toBe('0.5');
    expect(generateFractionalIndex(null, '0.5')).toBe('0.25');
    expect(generateFractionalIndex(null, '0.002')).toBe('0.001');
     // Handles case where next is very small, ensuring positive or distinct small value
    expect(generateFractionalIndex(null, "0.0000001")).toBe("0.00000005");
    expect(generateFractionalIndex(null, "2.0")).toBe("1.0");

  });

  it('should generate an index when next is null (end of the list)', () => {
    expect(generateFractionalIndex('1.0', null)).toBe('2.0');
    expect(generateFractionalIndex('0.5', null)).toBe('1.5');
    expect(generateFractionalIndex('10.125', null)).toBe('11.125');
  });

  it('should generate "1.0" when both prev and next are null (first item in an empty list)', () => {
    expect(generateFractionalIndex(null, null)).toBe('1.0');
  });

  it('should generate an index between two close numbers', () => {
    expect(generateFractionalIndex('1.125', '1.126')).toBe('1.1255');
    expect(generateFractionalIndex('0.0001', '0.0002')).toBe('0.00015');
  });

  it('should always return a string', () => {
    expect(typeof generateFractionalIndex('1.0', '2.0')).toBe('string');
    expect(typeof generateFractionalIndex(null, '1.0')).toBe('string');
    expect(typeof generateFractionalIndex('1.0', null)).toBe('string');
    expect(typeof generateFractionalIndex(null, null)).toBe('string');
  });

  it('should handle prev >= next by placing item after prev as a fallback', () => {
    // This behavior is specified in the function's comments.
    global.console.warn = jest.fn(); // Mock console.warn
    expect(generateFractionalIndex('2.0', '1.0')).toBe('3.0');
    expect(generateFractionalIndex('1.5', '1.5')).toBe('2.5');
    expect(console.warn).toHaveBeenCalledWith('prevIndex 2.0 is not less than nextIndex 1.0. Placing item after prev.');
  });

  it('should handle very small next when prev is null', () => {
    expect(generateFractionalIndex(null, '0.00000000000000000000000000000000000000000000000001'))
      .toBe('0.000000000000000000000000000000000000000000000000005');
  });

  it('should handle negative numbers if they are somehow passed (though typically not expected for order indices)', () => {
    expect(generateFractionalIndex('-2.0', '-1.0')).toBe('-1.5');
    expect(generateFractionalIndex(null, '-1.0')).toBe('-0.5'); // next / 2
    expect(generateFractionalIndex('-1.0', null)).toBe('0.0'); // prev + 1.0
    expect(generateFractionalIndex(null, "0.0")).toBe("-1.0"); // next is 0, next/2 is 0, so next - 1.0
    expect(generateFractionalIndex(null, "1.0")).toBe("0.5"); // next is 1.0, next/2 is 0.5
  });
});
