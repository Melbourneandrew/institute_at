create table prompts (
    prompt_key text primary key,
    prompt text not null,
    created_at timestamp with time zone default now() not null
);

create table models (
    id uuid primary key default gen_random_uuid(),
    model_name text not null,
    model_url text not null,
    created_at timestamp with time zone default now() not null
);

create table authors (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    model_id uuid references models(id),
    system_prompt_key text references prompts(prompt_key) not null,
    profile_picture_url text,
    created_at timestamp with time zone default now() not null
);

create table topics (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    slug text not null,
    created_by_author_id uuid references authors(id),
    created_by_user_name text,
    published_at timestamp with time zone,
    created_at timestamp with time zone default now() not null
);

create table essays (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text not null,
    content text not null,
    topic_id uuid references topics(id) not null,
    author_id uuid references authors(id) not null,
    model_name text not null,
    created_at timestamp with time zone default now() not null
);

create table reviews (
    id uuid primary key default gen_random_uuid(),
    essay_id uuid references essays(id) not null,
    author_id uuid references authors(id) not null,
    content text not null,
    created_at timestamp with time zone default now() not null,
    unique(essay_id, author_id)
);

create table tasks (
    id uuid primary key default gen_random_uuid(),
    prompt text not null,
    author_id uuid references authors(id) not null,
    topic_id uuid references topics(id),
    essay_id uuid references essays(id),
    review_id uuid references reviews(id),
    parent_task_id uuid references tasks(id),
    created_at timestamp with time zone default now() not null,
    completed_at timestamp with time zone
);

create table task_logs (
    id uuid primary key default gen_random_uuid(),
    task_id uuid references tasks(id) not null,
    created_at timestamp with time zone default now() not null,
    content text not null
);


-- Create indexes for foreign keys to improve query performance
create index essays_topic_id_idx on essays(topic_id);
create index essays_author_id_idx on essays(author_id);
create index reviews_essay_id_idx on reviews(essay_id);
create index reviews_author_id_idx on reviews(author_id);

CREATE FUNCTION public.generate_review_content(essay_title TEXT, essay_description TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN 'This essay on "' || essay_title || '" presents ' || 
            essay_description || '. The analysis is thorough and provides valuable insights into the topic.';
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger and function if they exist
drop trigger if exists handle_task_webhook on tasks;
drop function if exists handle_task_webhook_fn;

-- Create the trigger function
create or replace function handle_task_webhook_fn()
returns trigger as $$
begin
  perform net.http_post(
    url:='http://host.docker.internal:3000/handle_task'::text,
    body:=row_to_json(NEW)::jsonb
  );
  return NEW;
end;
$$ language plpgsql;

-- Create the trigger
create trigger handle_task_webhook
  after insert on tasks
  for each row
  execute function handle_task_webhook_fn();


-- Create a function that returns a task tree
CREATE OR REPLACE FUNCTION get_task_tree(root_task_id uuid)
RETURNS TABLE (
    id uuid,
    prompt text,
    author_id uuid,
    topic_id uuid,
    essay_id uuid,
    review_id uuid,
    parent_task_id uuid,
    created_at timestamp with time zone,
    completed_at timestamp with time zone,
    level int
) AS $$
WITH RECURSIVE task_tree AS (
    -- Base case: get the root task
    SELECT 
        t.*,
        0 as level
    FROM tasks t
    WHERE t.id = root_task_id

    UNION ALL

    -- Recursive case: get all child tasks
    SELECT 
        t.*,
        tt.level + 1
    FROM tasks t
    INNER JOIN task_tree tt ON t.parent_task_id = tt.id
)
SELECT * FROM task_tree
ORDER BY level, created_at;
$$ LANGUAGE sql;
