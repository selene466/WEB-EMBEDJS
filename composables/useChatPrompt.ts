export function useChatContext<T>() {
  const prompt = ref();
  const aiAnswer = ref("");
  const chatContext = ref<T[]>([]) as Ref<T[]>;
  const loadingAnswer = ref<boolean>(false);

  const resetPrompt = () => {
    prompt.value = "";
  };

  const addChatContextItem = (item: T) => {
    chatContext.value.push(item);
    aiAnswer.value = "";
  };

  const getContextToString = (): string => {
    return JSON.stringify(chatContext.value.slice(-2));
  };

  const toggleLoading = () => {
    loadingAnswer.value = !loadingAnswer.value;
  };

  const resetAll = () => {
    chatContext.value = [];
    prompt.value = "";
  };

  return {
    resetPrompt,
    resetAll,
    addChatContextItem,
    getContextToString,
    prompt,
    chatContext,
    aiAnswer,
    loadingAnswer,
    toggleLoading,
  };
}
