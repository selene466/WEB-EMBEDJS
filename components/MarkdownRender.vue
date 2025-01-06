<script setup lang="ts">
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/monokai-sublime.min.css";
import mermaid from "mermaid";

// const
const MERMAID_IDENTIFIERS = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "gantt",
  "classDiagram",
  "stateDiagram",
  "pie",
];

const isMermaidCodeBlock = (code: string): boolean => {
  const firstLine = code.split("\n")[0].trim();
  return MERMAID_IDENTIFIERS.some((identifier) =>
    firstLine.startsWith(identifier),
  );
};

const extractMermaidCode = (text: string): string[] => {
  let cleantext = text.replace("mermaid", "");
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const matches: string[] = [];
  let match;

  while ((match = codeBlockRegex.exec(cleantext)) !== null) {
    const code = match[1].replace("mermaid", "").trim();
    if (isMermaidCodeBlock(code)) {
      matches.push(code);
    }
  }

  return matches;
};

const randomId = Math.random().toString(36).slice(2);

// mounted
onMounted(() => {
  mermaid.initialize({ startOnLoad: true, theme: "forest" });
});

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code: string) {
      const result = hljs.highlightAuto(code);
      return result.value;
    },
  }),
);

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
});

const parsedContent = computed(() => {
  let mermaidCodeBlocks = extractMermaidCode(props.content);
  let text = marked.parse(props.content);
  setTimeout(() => {
    let container = document.getElementById("mermaid-" + randomId);

    if (mermaidCodeBlocks.length > 0 && container) {
      mermaid
        .render(
          "mermaidGraph",
          mermaidCodeBlocks[0].replace("|>", "|").replace("()", ""),
        )
        .then((res) => {
          let divs = document.createElement("div");
          divs.innerHTML = res.svg;
          container.appendChild(divs);
        });
    }
  }, 2000);

  return text.toString().replace("<table>", '<table class="table-auto">');
});
</script>
<template>
  <div v-html="parsedContent"></div>
  <div class="my-4">
    <div :id="'mermaid-' + randomId" class="w-full"></div>
  </div>
</template>
<style module lang="postcss">
code {
  @apply rounded-lg my-2;
}

table {
  border-collapse: collapse;
  width: 100%;
}

table td,
table th {
  border: 1px solid #ddd;
  padding: 8px;
}

table th {
  padding-top: 12px;
  padding-bottom: 12px;
  text-align: left;
  background-color: #8484ff;
  color: white;
}

table tr:hover {
  background-color: #dfdfff !important;
}

table tr:nth-child(even) {
  background-color: #f4f4ff;
}

table tr td::selection {
  background-color: #0000ff;
  color: white;
}
</style>
