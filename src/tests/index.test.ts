// src/tests/index.test.ts

import app from "../index"; // Adjust path if your app export is elsewhere

describe("Hono App Tests", () => {
	it("should return Hello! for the root route GET /", async () => {
		const res = await app.request("/");
		const text = await res.text();

		expect(res.status).toBe(200);
		expect(text).toContain("<h1>Hello!</h1>");
	});

	it("should return 404 for non-existent route", async () => {
		const res = await app.request("/non-existent-path");
		expect(res.status).toBe(404);
	});
});
