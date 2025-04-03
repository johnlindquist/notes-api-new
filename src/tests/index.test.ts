// src/tests/index.test.ts
import app, { type Note, testOnlyNotes, testOnlyResetNotes } from "../index"; // Import app, Note type, and test helpers

// Helper function to make testing easier
const makeRequest = (path: string, options?: RequestInit) => {
	return app.request(path, options);
};

describe("Notes CRUD API Tests", () => {
	// Reset notes before each test to ensure isolation
	beforeEach(() => {
		testOnlyResetNotes();
	});

	// --- Test Root Route ---
	it("GET / should return HTML", async () => {
		const res = await makeRequest("/");
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("text/html");
		expect(await res.text()).toContain("<h1>Notes App API is Running!</h1>");
	});

	// --- Test POST /api/notes (Create) ---
	describe("POST /api/notes", () => {
		it("should create a new note successfully", async () => {
			const noteData = { title: "Test Note", content: "Test Content" };
			const res = await makeRequest("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(noteData),
			});

			expect(res.status).toBe(201);
			const createdNote = await res.json<Note>();
			expect(createdNote).toMatchObject(noteData); // Check if title/content match
			expect(createdNote).toHaveProperty("id");
			expect(createdNote).toHaveProperty("createdAt");
			expect(createdNote).toHaveProperty("updatedAt");

			// Verify it's actually stored (using exported test helper)
			expect(testOnlyNotes).toHaveLength(1);
			expect(testOnlyNotes[0]).toEqual(createdNote);
		});

		it("should return 400 if title or content is missing", async () => {
			const badData = [
				{ title: "Only Title" },
				{ content: "Only Content" },
				{},
			];
			for (const data of badData) {
				const res = await makeRequest("/api/notes", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				expect(res.status).toBe(400);
				const errorText = await res.text();
				expect(errorText).toBe("Title and content are required");
			}
			expect(testOnlyNotes).toHaveLength(0); // Ensure nothing was added
		});

		it("should return 400 for invalid JSON body", async () => {
			const res = await makeRequest("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "{invalid json",
			});
			expect(res.status).toBe(400);
			const errorText = await res.text();
			expect(errorText).toBe("Invalid request body");
		});
	});

	// --- Test GET /api/notes (Read All) ---
	describe("GET /api/notes", () => {
		it("should return an empty array when no notes exist", async () => {
			const res = await makeRequest("/api/notes");
			expect(res.status).toBe(200);
			expect(await res.json<Note[]>()).toEqual([]);
		});

		it("should return all existing notes", async () => {
			// Add some notes first
			await makeRequest("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Note 1", content: "Content 1" }),
			});
			await makeRequest("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Note 2", content: "Content 2" }),
			});

			const res = await makeRequest("/api/notes");
			expect(res.status).toBe(200);
			const notes = await res.json<Note[]>();
			expect(notes).toHaveLength(2);
			expect(notes[0].title).toBe("Note 1");
			expect(notes[1].title).toBe("Note 2");
		});
	});

	// --- Test GET /api/notes/:id (Read One) ---
	describe("GET /api/notes/:id", () => {
		it("should return a single note if found", async () => {
			const postRes = await makeRequest("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Find Me", content: "Here I am" }),
			});
			const { id } = await postRes.json<Note>();

			const res = await makeRequest(`/api/notes/${id}`);
			expect(res.status).toBe(200);
			const note = await res.json<Note>();
			expect(note.id).toBe(id);
			expect(note.title).toBe("Find Me");
		});

		it("should return 404 if note not found", async () => {
			const res = await makeRequest("/api/notes/999"); // Non-existent ID
			expect(res.status).toBe(404);
			const errorText = await res.text();
			expect(errorText).toBe("Note not found");
		});
	});

	// --- Test PUT /api/notes/:id (Update) ---
	describe("PUT /api/notes/:id", () => {
		it("should update an existing note", async () => {
			const postRes = await makeRequest("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: "Original Title",
					content: "Original Content",
				}),
			});
			const { id, createdAt } = await postRes.json<Note>();

			const updatedData = {
				title: "Updated Title",
				content: "Updated Content",
			};
			const putRes = await makeRequest(`/api/notes/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updatedData),
			});

			expect(putRes.status).toBe(200);
			const updatedNote = await putRes.json<Note>();
			expect(updatedNote.id).toBe(id);
			expect(updatedNote.title).toBe("Updated Title");
			expect(updatedNote.content).toBe("Updated Content");
			expect(updatedNote.createdAt).toBe(createdAt); // createdAt should not change
			expect(updatedNote.updatedAt >= createdAt).toBe(true);

			// Verify in storage
			const storedNote = testOnlyNotes.find((n) => n.id === id);
			expect(storedNote).toBeDefined();
			expect(storedNote).toEqual(updatedNote);
		});

		it("should return 404 if note to update is not found", async () => {
			const res = await makeRequest("/api/notes/999", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: "Update NonExistent",
					content: "Content",
				}),
			});
			expect(res.status).toBe(404);
		});

		it("should return 400 if title or content is missing on update", async () => {
			const postRes = await makeRequest("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "To Update", content: "..." }),
			});
			const { id } = await postRes.json<Note>();

			const badData = [
				{ title: "Only Title" },
				{ content: "Only Content" },
				{},
			];
			for (const data of badData) {
				const res = await makeRequest(`/api/notes/${id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				expect(res.status).toBe(400);
				const errorText = await res.text();
				expect(errorText).toBe("Title and content are required");
			}
		});
	});

	// --- Test DELETE /api/notes/:id (Delete) ---
	describe("DELETE /api/notes/:id", () => {
		it("should delete an existing note and return 204", async () => {
			const postRes = await makeRequest("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "To Delete", content: "Bye" }),
			});
			const { id } = await postRes.json<Note>();
			expect(testOnlyNotes).toHaveLength(1); // Verify it exists

			const deleteRes = await makeRequest(`/api/notes/${id}`, {
				method: "DELETE",
			});
			expect(deleteRes.status).toBe(204); // No Content
			expect(await deleteRes.text()).toBe(""); // No body for 204

			// Verify it's removed from storage
			expect(testOnlyNotes).toHaveLength(0);

			// Verify GET returns 404 now
			const getRes = await makeRequest(`/api/notes/${id}`);
			expect(getRes.status).toBe(404);
		});

		it("should return 404 if note to delete is not found", async () => {
			const res = await makeRequest("/api/notes/999", { method: "DELETE" });
			expect(res.status).toBe(404);
			const errorText = await res.text();
			expect(errorText).toBe("Note not found");
		});
	});

	// --- Test Non-existent API Route ---
	it("should return 404 for non-existent API route", async () => {
		const res = await makeRequest("/api/non-existent-path");
		expect(res.status).toBe(404);
		// Hono's default 404 might not be JSON, check based on behavior or add specific handling
		// For now, just check status. If you added a global error handler returning JSON:
		// const error = await res.json();
		// expect(error.message).toContain("Not Found");
	});
});
