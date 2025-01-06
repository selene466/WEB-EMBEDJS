<script setup lang="ts">
import { useChatContext } from "./composables/useChatPrompt";
import type IChatContext from "./models/IChatContext";
import axios, { AxiosError } from "axios";

const {
  chatContext,
  addChatContextItem,
  prompt,
  getContextToString,
  resetPrompt,
  aiAnswer,
  loadingAnswer,
  toggleLoading,
  resetAll,
} = useChatContext<IChatContext>();

const tabList = [
  {
    label: "Chat AI",
    icon: "mingcute:message-4-fill",
    slot: "chatai",
  },
  {
    label: "File Manager",
    icon: "mingcute:folder-2-fill",
    slot: "filemanager",
  },
];

// config
const config = useRuntimeConfig();

// mounted
onMounted(() => {
  setTimeout(() => {
    startNewSession();
    getListFile();
    loadedFile.value = [];
  }, 1000);
});

// ref
const showChatPrompt = ref<boolean>(true);
const showLoadingListFile = ref<boolean>(false);
const resDataListFile = ref<
  {
    id: string;
    name: string;
    checksum: string;
    mime: string;
    size: number;
    path: string;
  }[]
>([]);
const loadedFile = ref<
  {
    id: string;
    name: string;
    checksum: string;
    mime: string;
    size: number;
    path: string;
  }[]
>([]);

const addLoadedFile = (file: {
  id: string;
  name: string;
  checksum: string;
  mime: string;
  size: number;
  path: string;
}) => {
  removeFromFileLoader();
  loadedFile.value.push(file);

  loadedFile.value.map((f) => {
    addFileLoader(f.path);
  });
};

const removeLoadedFile = (id: string) => {
  removeFromFileLoader();
  loadedFile.value = loadedFile.value.filter((file) => file.id !== id);

  loadedFile.value.map((f) => {
    addFileLoader(f.path);
  });
};

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const errorMessage = ref<string | null>(null);
const allowedTypes = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/pdf", // .pdf
];

const selectFile = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    if (!allowedTypes.includes(file.type)) {
      errorMessage.value =
        "Invalid file type. Only DOCX, PPTX, XLSX, and PDF files are allowed.";
      selectedFile.value = null;
    } else {
      selectedFile.value = file;
      errorMessage.value = null;
    }
  }
};

const uploadFile = async () => {
  if (!selectedFile.value) {
    errorMessage.value = "Please select a valid file first.";
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile.value);

  try {
    const response = await axios.post(
      config.public.serverUrl + "/api/llm/upload",
      formData,
      {
        timeout: 60000,
      },
    );

    console.log("Upload successful", response);
  } catch (error) {
    console.error("Upload failed", error);
  } finally {
    selectedFile.value = null;
    errorMessage.value = null;
    getListFile();
  }
};

// function
const getListFile = async () => {
  try {
    showLoadingListFile.value = true;
    let response = await axios.get(
      config.public.serverUrl + "/api/llm/list-file",
      {
        timeout: 60000,
      },
    );

    resDataListFile.value = response.data;
  } catch (error) {
    console.error(error);
  } finally {
    showLoadingListFile.value = false;
  }
};

const removeFromFileLoader = async () => {
  try {
    await axios.post(config.public.serverUrl + "/api/llm/remove-file-loader", {
      timeout: 60000,
    });
  } catch (error) {
    console.error(error);
  }
};

const addFileLoader = async (path: string) => {
  try {
    await axios.post(
      config.public.serverUrl + "/api/llm/add-file-loader",
      {
        path,
      },
      {
        timeout: 60000,
      },
    );
  } catch (error) {
    console.error(error);
  }
};

const sendPromptToAI = async () => {
  try {
    if (loadingAnswer.value) return;

    toggleLoading();

    addChatContextItem({
      role: "user",
      content: prompt.value,
    });

    const response = await axios.post(
      config.public.serverUrl + "/api/llm/prompt",
      {
        context: getContextToString(),
        prompt: prompt.value,
      },
      {
        timeout: 60000,
      },
    );

    if (response.data) {
      toggleLoading();
      resetPrompt();
      aiAnswer.value += response.data.content;

      addChatContextItem({
        role: "assistant",
        content: aiAnswer.value,
      });
      chatBoxScrollBottom();
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  }
};

const handleSend = () => {
  sendPromptToAI();
};

const startNewSession = async () => {
  try {
    await axios.get(config.public.serverUrl + "/api/llm/delete-conversation", {
      timeout: 60000,
    });
  } catch (error) {
    console.error(error);
  } finally {
    resetAll();
  }
};

const chatBoxScrollBottom = () => {
  const chatBox = document.getElementById("chat-box");
  if (chatBox) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

function onChangeTabList(index: number) {
  const tab = tabList[index];

  if (tab.slot !== "chatai") showChatPrompt.value = false;
  else showChatPrompt.value = true;
}

// watcher
watch(
  () => loadingAnswer.value,
  () => chatBoxScrollBottom(),
);
</script>

<template>
  <div class="h-screen w-screen relative overflow-hidden bg-gray-50">
    <UContainer class="relative w-full h-full overflow-hidden py-4">
      <UTabs :items="tabList" class="w-full" @change="onChangeTabList">
        <template #chatai>
          <div
            id="chat-box"
            class="overflow-y-scroll w-full px-8 pt-4 h-[90vh]"
          >
            <div v-if="chatContext.length === 0">
              <UCard class="bg-gray-50">
                Tidak ada percakapan, mulai percakapan
              </UCard>
            </div>
            <ul class="space-y-2" v-else>
              <li class="box" v-for="chat in chatContext">
                <UCard>
                  <h1 class="font-bold relative" v-if="chat.role === 'user'">
                    You
                  </h1>
                  <h1 class="font-bold" v-else>AI</h1>
                  <LazyMarkdownRender :content="chat.content" />
                </UCard>
              </li>

              <li class="box" v-if="loadingAnswer || aiAnswer">
                <div v-if="loadingAnswer">
                  <UCard>
                    <div class="flex gap-2.5 items-end">
                      <h1 class="font-black">AI</h1>
                      <span>
                        <Icon
                          name="mingcute:loading-line"
                          class="animate-spin inline-block"
                        />
                      </span>
                    </div>
                  </UCard>
                </div>
                <div v-else v-if="aiAnswer">
                  <UCard>
                    <h1 class="font-bold">AI</h1>
                    <LazyMarkdownRender :content="aiAnswer" />
                  </UCard>
                </div>
              </li>
            </ul>
            <div class="h-[360px]"></div>
          </div>
        </template>

        <template #filemanager="">
          <UCard>
            <template #header>
              <div class="w-full my-4 flex gap-4">
                <UButton
                  @click="selectFile"
                  type="button"
                  color="blue"
                  variant="solid"
                  icon="mingcute:document-2-fill"
                  :trailing="false"
                  label="Pilih File"
                />
                <input
                  type="file"
                  ref="fileInput"
                  @change="handleFileChange"
                  style="display: none"
                  accept=".docx, .pptx, .xlsx, .pdf"
                />
                <p v-if="selectedFile">
                  Selected file: {{ selectedFile.name }}
                </p>
                <p v-if="errorMessage" style="color: red">
                  {{ errorMessage }}
                </p>
                <UButton
                  @click="uploadFile"
                  type="button"
                  color="blue"
                  variant="solid"
                  icon="mingcute:upload-line"
                  :trailing="false"
                  label="Upload"
                  :disabled="!selectedFile"
                />
              </div>
              <div
                v-if="showLoadingListFile"
                class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
              >
                <Icon name="mingcute:loading-line" class="animate-spin" />
                Loading...
              </div>
              <div v-else-if="resDataListFile.length">
                <h1
                  class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
                >
                  File Manager
                </h1>
                <div class="w-full">
                  <table class="table-fixed w-full">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th class="text-end">Size</th>
                        <th class="text-end">Mime</th>
                        <th class="text-end">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(file, index) in resDataListFile" :key="index">
                        <td>
                          {{ file.name }}
                        </td>
                        <td class="text-end">
                          {{ Math.round(file.size / 1024) }} KB
                        </td>
                        <td class="text-end uppercase">
                          <span>
                            {{ file.path.split(".").pop() }}
                          </span>
                        </td>
                        <td class="text-end">
                          <UButton
                            v-if="!loadedFile.find((f) => f.id === file.id)"
                            @click="addLoadedFile(file)"
                            type="button"
                            color="blue"
                            variant="solid"
                            icon="mingcute:plus-fill"
                            :trailing="false"
                            label="Tambah"
                          />
                          <UButton
                            v-if="loadedFile.find((f) => f.id === file.id)"
                            @click="removeLoadedFile(file.id)"
                            type="button"
                            color="red"
                            variant="solid"
                            icon="mingcute:delete-fill"
                            :trailing="false"
                            label="Buang"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div
                v-else
                class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
              >
                Tidak ada file
              </div>
            </template>
          </UCard>
        </template>
      </UTabs>
      <UCard
        @submit.prevent="sendPromptToAI"
        class="absolute bottom-0 left-0 right-0 rounded-b-none transition-all max-w-[95%] mx-auto"
        :class="showChatPrompt ? 'translate-y-0' : 'translate-y-full'"
      >
        <UTextarea
          @keydown.enter.prevent="handleSend"
          v-model="prompt"
          variant="outline"
          placeholder="Tanya sesuatu..."
        />

        <template #footer>
          <div class="w-full flex justify-between items-center">
            <div>
              <div>{{ loadedFile.length }} file ditambahkan</div>
            </div>
            <div class="flex gap-2.5 items-center">
              <UButton
                @click="startNewSession()"
                type="button"
                color="blue"
                variant="solid"
                icon="mingcute:newdot-fill"
                :trailing="false"
                label="Sesi Baru"
              />
              <UButton
                type="submit"
                color="blue"
                variant="solid"
                icon="mingcute:send-fill"
                :trailing="false"
                label="Kirim"
              />
            </div>
          </div>
        </template>
      </UCard>
    </UContainer>
  </div>
</template>
