const categoryTpl = document.getElementById("sidebar")?.querySelector<HTMLTemplateElement>("template.category")?.content;

type Category = {
    name: string;
    id: string;
};

async function loadCategories(categories: [Category]) {
    if (!categoryTpl) return;

    categories.forEach((cat) => {
        const categoryClone = categoryTpl.cloneNode(true) as DocumentFragment;
        categoryClone.querySelector("p")!.textContent = cat.name;

        const item = categoryClone.firstElementChild as HTMLElement;

        item.id = cat.name;

        document.getElementById("sidebar")?.appendChild(categoryClone);

        item?.addEventListener("click", (e) => {
            window.location.pathname = `/settings/${cat.id}`;
        });
    });
}

const categoriesRes = await fetch("/api/settings/categories");

if (!categoriesRes.ok) {
    console.error("Could not get settings categories:", categoriesRes.statusText);
} else {
    const categoriesData = await categoriesRes.json();

    if (!window.location.pathname.split("/")[2]) window.location.pathname = `/settings/${categoriesData[0].id}`;

    await loadCategories(categoriesData);
}