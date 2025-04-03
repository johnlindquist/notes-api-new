import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { renderer } from "./renderer";

// --- Data Structure and Storage (In-Memory) ---
export type Note = {
	id: string;
	title: string;
	content: string;
	createdAt: string;
	updatedAt: string;
};

// WARNING: In-memory storage. Data is lost on restart/redeploy.
// Replace with KV, D1, etc., for persistence.
let notes: Note[] = [];
let nextId = 1; // Simple ID generator

// --- Hono App Setup ---
const app = new Hono();

// Root route still serves HTML via renderer
app.use("/", renderer);
app.get("/", (c) => {
	return c.render(<h1>Notes App API is Running!</h1>);
});

// --- API Routes (/api/notes) ---
const api = new Hono().basePath("/api");

// GET /api/notes - Get all notes
api.get("/notes", (c) => {
	return c.json(notes);
});

// POST /api/notes - Create a new note
api.post("/notes", async (c) => {
	try {
		const { title, content } = await c.req.json<{
			title: string;
			content: string;
		}>();
		if (!title || !content) {
			throw new HTTPException(400, {
				message: "Title and content are required",
			});
		}
		const now = new Date().toISOString();
		const newNote: Note = {
			id: (nextId++).toString(),
			title,
			content,
			createdAt: now,
			updatedAt: now,
		};
		notes.push(newNote);
		return c.json(newNote, 201); // Respond with created note and status 201
	} catch (error) {
		if (error instanceof HTTPException) throw error;
		// Handle JSON parsing errors or other unexpected issues
		console.error("Error creating note:", error);
		throw new HTTPException(400, { message: "Invalid request body" });
	}
});

// GET /api/notes/:id - Get a single note by ID
api.get("/notes/:id", (c) => {
	const id = c.req.param("id");
	const note = notes.find((n) => n.id === id);
	if (!note) {
		throw new HTTPException(404, { message: "Note not found" });
	}
	return c.json(note);
});

// PUT /api/notes/:id - Update a note by ID
api.put("/notes/:id", async (c) => {
	const id = c.req.param("id");
	const noteIndex = notes.findIndex((n) => n.id === id);
	if (noteIndex === -1) {
		throw new HTTPException(404, { message: "Note not found" });
	}

	try {
		const { title, content } = await c.req.json<{
			title: string;
			content: string;
		}>();
		if (!title || !content) {
			throw new HTTPException(400, {
				message: "Title and content are required",
			});
		}
		const now = new Date().toISOString();
		const updatedNote = {
			...notes[noteIndex],
			title,
			content,
			updatedAt: now,
		};
		notes[noteIndex] = updatedNote;
		return c.json(updatedNote);
	} catch (error) {
		if (error instanceof HTTPException) throw error;
		console.error(`Error updating note ${id}:`, error);
		throw new HTTPException(400, { message: "Invalid request body" });
	}
});

// DELETE /api/notes/:id - Delete a note by ID
api.delete("/notes/:id", (c) => {
	const id = c.req.param("id");
	const initialLength = notes.length;
	notes = notes.filter((n) => n.id !== id);
	if (notes.length === initialLength) {
		throw new HTTPException(404, { message: "Note not found" });
	}
	// Use 200 with message or 204 No Content
	// return c.json({ message: "Note deleted successfully" });
	return new Response(null, { status: 204 }); // Standard practice for DELETE success
});

// Register API routes with the main app
app.route("/", api);

// --- Error Handling ---
app.onError((err, c) => {
	console.error(`${err}`);
	if (err instanceof HTTPException) {
		// Use HTTPException status and message
		return err.getResponse();
	}
	// Default internal server error
	return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

export default app;
// Export notes array and a reset function ONLY for testing purposes
export { notes as testOnlyNotes, resetNotes as testOnlyResetNotes };
function resetNotes() {
	notes = [];
	nextId = 1;
}
