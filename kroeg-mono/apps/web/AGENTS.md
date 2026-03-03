# Solid.js Best Practices

## 1. Call Functions When Passing Signals to JSX Props

Always invoke signal functions when passing them as props. Components shouldn't need to know whether
a value comes from a signal or a static value.

```javascript
// Good
<User id={id()} name="Brenley" />

// Bad - passes the signal itself, not its value
<User id={id} name="Brenley" />
```

## 2. Don't Destructure Props

Access props through the object directly. Destructuring extracts the current value and breaks the
reactive getter chain, so updates from the parent won't trigger re-renders.

```javascript
// Good
function User(props) {
  return <h1>{props.name}</h1>;
}

// Bad - loses reactivity
function User({ name }) {
  return <h1>{name}</h1>;
}
```

Use `splitProps` if you need to separate props while preserving reactivity.

## 3. Use Function Wrappers for Reactive Values

The component body runs only once. Signal reads outside reactive scopes (`JSX`, `createEffect`,
`createMemo`) create one-time snapshots, not dynamic values.

```javascript
// Good - reactive derivation
const doubled = createMemo(() => count() * 2);
return <div>{doubled()}</div>;

// Bad - computed once, never updates
const doubled = count() * 2;
```

## 4. Use Solid's Control-Flow Components

Use `<Show>` for conditionals and `<For>` for lists instead of inline JS expressions. These give
Solid explicit control flow it can optimize.

```javascript
// Conditionals
<Show when={open()} fallback={<EmptyState />}>
  <SidebarMenu />
</Show>

// Lists
<For each={items()}>{item => <Item item={item} />}</For>
```

## 5. Use createEffect Sparingly

Reserve `createEffect` for interactions with external systems (DOM manipulation, third-party
libraries). Most state concerns have better declarative alternatives.

## 6. Don't Fetch in Effects

Use `createResource` or `createAsync` (SolidStart) for data fetching instead of `createEffect` with
async operations. Effects cause empty-state flashes, lack built-in error handling, and can create
race conditions.

```javascript
// Good
const [posts] = createResource(() => fetch("/api/posts").then((r) => r.json()));

// Bad - fetching inside an effect
createEffect(async () => {
  const res = await fetch("/api/posts");
  setPosts(await res.json());
});
```

## 7. Don't Synchronize State with Effects

Derive values declaratively using functions or `createMemo` rather than syncing multiple state
pieces via effects.

```javascript
// Good - derived value
const fullName = () => `${firstName()} ${lastName()}`;

// Bad - manual sync via effect
const [fullName, setFullName] = createSignal("");
createEffect(() => {
  setFullName(`${firstName()} ${lastName()}`);
});
```

## 8. Derive as Much as Possible

Build reactive relationships through direct derivation rather than manual synchronization. Derived
values keep Solid's dependency graph intact, enabling fine-grained updates and optimal performance.

## 9. Use Stores for Complex Objects

Use `createStore` for complex or nested objects instead of signals containing objects. Stores
provide fine-grained reactivity at the property level, while signals require replacing entire
objects on any change.

```javascript
// Good - granular updates
const [board, setBoard] = createStore({
  boards: ["Board 1"],
  notes: ["Note 1"],
});
setBoard("notes", (notes) => [...notes, "Note 3"]);

// Bad - replaces entire object
const [board, setBoard] = createSignal({
  boards: ["Board 1"],
  notes: ["Note 1"],
});
setBoard({ ...board(), notes: [...board().notes, "Note 3"] });
```

## 10. Don't Await in SolidStart Preload Functions

Start async work in preload without awaiting. Let components handle resolution via `createAsync`.
This "warms up" the cache early, potentially completing work before the component renders.

```javascript
// Good - fires off the fetch, doesn't await
export const route = {
  preload: () => getPosts(),
};

export default function Page() {
  const posts = createAsync(() => getPosts());
}
```

## 11. Use Queries for Server Data Retrieval

Wrap server functions with the `query` utility for automatic deduplication, caching, and
invalidation.

## 12. Use Actions for Data Mutations

Use the `action` utility for server mutations. SolidStart recognizes when mutations complete and
intelligently revalidates affected queries across routes.
