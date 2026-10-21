export interface ChunkOptions {
	chunkSize: number;
}

export interface CorpusChunk {
	id: string;
	documentId: string;
	index: number;
	pageNumber: number;
	text: string;
}

const DEFAULT_CHUNK_SIZE = 600;

export function splitIntoChunks(
	documentId: string,
	pageText: string,
	options?: ChunkOptions,
): CorpusChunk[] {
	const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
	const pages = splitPages(pageText);

	const chunks: CorpusChunk[] = [];
	let index = 0;

	for (const page of pages) {
		if (!page.text) {
			continue;
		}
		for (const text of accumulate(splitSentences(page.text), chunkSize)) {
			chunks.push({
				id: `${documentId}:${index}`,
				documentId,
				index,
				pageNumber: page.pageNumber,
				text,
			});
			index += 1;
		}
	}

	return chunks;
}

function splitPages(pageText: string): { pageNumber: number; text: string }[] {
	const parts = pageText.split(/--- Page (\d+) ---/);
	const pages: { pageNumber: number; text: string }[] = [];

	for (let i = 1; i < parts.length; i += 2) {
		const pageNumber = Number.parseInt(parts[i], 10);
		const text = (parts[i + 1] ?? "").trim();
		if (Number.isFinite(pageNumber)) {
			pages.push({ pageNumber, text });
		}
	}

	return pages;
}

function splitSentences(text: string): string[] {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return [];
	}

	const sentences: string[] = [];
	const re = /[^.!?]+[.!?]+|[^.!?]+$/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(normalized)) !== null) {
		const sentence = match[0].trim();
		if (sentence) {
			sentences.push(sentence);
		}
	}
	return sentences;
}

function accumulate(sentences: string[], chunkSize: number): string[] {
	const chunks: string[] = [];
	let current = "";
	let previous = "";

	for (const sentence of sentences) {
		if (current && current.length + sentence.length + 1 > chunkSize) {
			chunks.push(current);
			current = previous ? `${previous} ${sentence}` : sentence;
		} else {
			current = current ? `${current} ${sentence}` : sentence;
		}
		previous = sentence;
	}

	if (current) {
		chunks.push(current);
	}

	return chunks;
}
