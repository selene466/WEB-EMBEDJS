<script setup lang="ts">
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/monokai-sublime.min.css";

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code: string) {
      return hljs.highlightAuto(code).value;
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
  return marked.parse(props.content);
});
</script>
<template>
  <div v-html="parsedContent"></div>
</template>
<style module lang="postcss">
code {
  @apply rounded-lg my-2;
}
</style>
