// src/tests/example.test.ts

// Since we enabled 'globals: true', we don't need to import these:
// import { describe, it, expect } from 'vitest'

describe("Example Suite", () => {
	it("should pass a basic truthiness test", () => {
		expect(true).toBe(true);
	});

	it("should perform addition correctly", () => {
		expect(1 + 1).toBe(2);
	});
});
