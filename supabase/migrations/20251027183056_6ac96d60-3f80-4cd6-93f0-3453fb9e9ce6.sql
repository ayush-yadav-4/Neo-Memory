
-- Helper function to insert memory with vector embedding
CREATE OR REPLACE FUNCTION public.insert_memory(
  p_content TEXT,
  p_embedding TEXT,
  p_metadata JSONB,
  p_api_key_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.memories (content, embedding, metadata, api_key_id)
  VALUES (p_content, p_embedding::vector, p_metadata, p_api_key_id)
  RETURNING memories.id, memories.content, memories.metadata, memories.created_at;
END;
$$;

-- Helper function to search memories by vector similarity
CREATE OR REPLACE FUNCTION public.search_memories(
  query_embedding TEXT,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  p_api_key_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    memories.id,
    memories.content,
    1 - (memories.embedding <=> query_embedding::vector) AS similarity,
    memories.metadata,
    memories.created_at
  FROM public.memories
  WHERE memories.api_key_id = p_api_key_id
    AND 1 - (memories.embedding <=> query_embedding::vector) > match_threshold
  ORDER BY memories.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;
