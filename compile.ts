type ItemInstanceSer = {
	readonly id: string
	readonly amount: number
}

type ItemSchema = {
	name: string
	tags?: string[]
	img?: string
	energy?: string
}


type RecipeSchemaInput = {
	id:string
	amount:number
} | {
	tag:string
	amount:number
}

type RecipeSchema = {
	id?:string
	inputs:RecipeSchemaInput[]
	outputs:{id:string, amount:number}[]
	requiredProcess:string
	requiredTier?:number
	processTimeSeconds?:number
}

type Recipe = RecipeSchema & {id:string}

async function loadJson<T>(path: string): Promise<T> {
  const text = await Deno.readTextFile(path)
  return JSON.parse(text)
}

const items = await loadJson<Record<string, ItemSchema>>("./game-data/items.json")

const recipes = (await loadJson<RecipeSchema[]>("./game-data/recipes.json")).map<Recipe>((rec, idx) => ({
	...rec,
	id:"r "+idx
}))

const recipesUsed = new Set<string>()

const isDryRun = Deno.args.includes("-dry") || Deno.args.includes("--dry")

function use(id:string) {
	const ids = recipes.filter(rec =>
		rec.inputs.some(input=>"id" in input && input.id === id)
		&& rec.inputs.length > 1
	).map(rec => rec.id)
	ids.forEach(id => recipesUsed.add(id))
	return ids
}

function directUse(id:string) {
	return recipes.filter(rec =>
		rec.inputs.length === 1 && "id" in rec.inputs[0] && rec.inputs[0].id === id
	).flatMap(rec =>
		rec.outputs.map(o => items[o.id].name)
	)
}

await Deno.mkdir("Obsidian/Items", { recursive: true })
await Deno.mkdir("Obsidian/Recipes", { recursive: true })

async function write(path:string, content:string) {
		if (isDryRun) {
		console.log(`write to: ${path}. content: ${content}`);
	} else {
		await Deno.writeTextFile(
			path,
			content
		)
	}
}

for (const key in items) {
	const item = items[key]
	const content = 
`# ${item.name}

Direct use:
${directUse(key).map(i => `- [[${i}]]`).join("\n")}
Recipe use:
${use(key).map(i => `- [[${i}]]`).join("\n")}
`

	write(`Obsidian/Items/${item.name}.md`, content)
}

for (const id of recipesUsed) {
	const recipe = recipes.find(rec => rec.id === id);
	if (recipe === undefined) continue
	
		const content = 
`# ${recipe.id}

Outputs:
${recipe.outputs.map(op => `- [[${items[op.id].name}]]`).join("\n")}
`

	write(`Obsidian/Recipes/${id}.md`, content)
}