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
    getListGroupFile();
    getListFile();
    loadedFile.value = [];
  }, 500);
});

// ref
const showChatPrompt = ref<boolean>(true);
const showLoadingListFile = ref<boolean>(false);
const resDataListGroupFile = ref<
  {
    id: string;
    name: string;
    files: {
      id: string;
      name: string;
      checksum: string;
      mime: string;
      size: number;
      path: string;
      fileGroupId: string | null;
    }[];
  }[]
>([]);
const resDataListFile = ref<
  {
    id: string;
    name: string;
    checksum: string;
    mime: string;
    size: number;
    path: string;
    fileGroupId: string | null;
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
    fileGroupId: string | null;
  }[]
>([]);

const addLoadedFile = async (file: {
  id: string;
  name: string;
  checksum: string;
  mime: string;
  size: number;
  path: string;
  fileGroupId: string | null;
}) => {
  removeFromFileLoader();
  loadedFile.value.push(file);

  loadedFile.value.map(async (f) => {
    await addFileLoader(f.path);
    await new Promise((resolve) => setTimeout(resolve, 1200));
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

const modalAddGroup = ref<boolean>(false);
const modalAddGroupInp = ref<string>("");
const modalAddGroupDisabled = ref<boolean>(false);

const modalEditGroup = ref<boolean>(false);
const modalEditGroupId = ref<string>("");
const modalEditGroupInp = ref<string>("");
const modalEditGroupDisabled = ref<boolean>(false);

const modalEditFile = ref<boolean>(false);
const modalEditFileId = ref<string>("");
const modalEditFileGroupName = ref<string>("");
const modalEditFileDisabled = ref<boolean>(false);

const selectedGroupId = ref<string>("");

// function
const getListGroupFile = async () => {
  try {
    showLoadingListFile.value = true;
    let response = await axios.get(
      config.public.serverUrl + "/api/llm/list-group",
      {
        timeout: 60000,
      },
    );

    resDataListGroupFile.value = response.data;
  } catch (error) {
    console.error(error);
  } finally {
    showLoadingListFile.value = false;
  }
};

const deleteGroup = async (id: string) => {
  try {
    await axios.delete(config.public.serverUrl + "/api/llm/delete-group/" + id);
  } catch (error) {
    console.error(error);
  } finally {
    getListGroupFile();
  }
};

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
      timeout: 500000,
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

const onChangeTabList = (index: number) => {
  const tab = tabList[index];

  if (tab.slot !== "chatai") showChatPrompt.value = false;
  else showChatPrompt.value = true;
};

const onSubmitAddGroup = async () => {
  modalAddGroupDisabled.value = true;
  try {
    await axios.post(config.public.serverUrl + "/api/llm/create-group", {
      name: modalAddGroupInp.value,
    });
  } catch (error) {
    console.error(error);
  } finally {
    modalAddGroupDisabled.value = false;
    toggleModalAddGroup();
    getListGroupFile();
  }
};

const onSubmitEditGroup = async () => {
  modalEditGroupDisabled.value = true;
  try {
    await axios.patch(
      config.public.serverUrl +
        "/api/llm/update-group/" +
        modalEditGroupId.value,
      {
        name: modalEditGroupInp.value,
      },
    );
  } catch (error) {
    console.error(error);
  } finally {
    modalEditGroupDisabled.value = false;
    modalEditGroupId.value = "";
    modalEditGroupInp.value = "";
    toggleModalEditGroup();
    getListGroupFile();
  }
};

const onSubmitEditFile = async () => {
  modalEditFileDisabled.value = true;
  try {
    await axios.patch(
      config.public.serverUrl + "/api/llm/file/" + modalEditFileId.value,
      {
        fileGroupId:
          resDataListGroupFile.value.find(
            (group) => group.name === modalEditFileGroupName.value,
          )?.id || null,
      },
    );
  } catch (error) {
    console.error(error);
  } finally {
    modalEditFileDisabled.value = false;
    modalEditFileId.value = "";
    toggleModalEditFile();
    getListGroupFile();
    getListFile();
  }
};

const btnAddGroup = () => {
  onSubmitAddGroup();
};

const btnEditFile = () => {
  onSubmitEditFile();
};

const toggleModalAddGroup = () => {
  modalAddGroup.value = !modalAddGroup.value;
};

const toggleModalEditGroup = () => {
  modalEditGroup.value = !modalEditGroup.value;
};

const toggleModalEditFile = () => {
  modalEditFile.value = !modalEditFile.value;
};

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
                    Anda
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
              <div class="w-full my-4 flex justify-between items-center">
                <div class="w-full flex gap-4">
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
                <div class="w-full flex gap-4 justify-end items-center">
                  <UButton
                    @click="toggleModalAddGroup()"
                    type="button"
                    color="blue"
                    variant="solid"
                    icon="mingcute:plus-fill"
                    :trailing="false"
                    label="Buat Group"
                  />
                  <UButton
                    v-if="loadedFile.length === 0"
                    @click="
                      () => {
                        resDataListFile.map(async (file) => {
                          addLoadedFile(file);
                        });
                      }
                    "
                    type="button"
                    color="blue"
                    variant="solid"
                    icon="mingcute:plus-fill"
                    :trailing="false"
                    label="Tambah Semua"
                    disabled
                  />
                  <UButton
                    v-if="loadedFile.length > 0"
                    @click="
                      loadedFile.map(async (file) => {
                        removeLoadedFile(file.id);
                      })
                    "
                    type="button"
                    color="red"
                    variant="solid"
                    icon="mingcute:delete-fill"
                    :trailing="false"
                    label="Buang Semua"
                  />
                </div>
              </div>
              <div
                v-if="showLoadingListFile"
                class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
              >
                <Icon name="mingcute:loading-line" class="animate-spin" />
                Loading...
              </div>
              <div
                v-else-if="resDataListFile.length"
                class="max-h-[80vh] overflow-y-scroll pr-4"
              >
                <div
                  class="w-full flex justify-between items-center gap-4 mb-4"
                >
                  <div class="flex gap-2.5 items-center">
                    <UButton
                      v-if="selectedGroupId != ''"
                      @click="selectedGroupId = ''"
                      type="button"
                      color="blue"
                      variant="solid"
                      icon="mingcute:arrow-left-line"
                      :trailing="false"
                      label="Kembali"
                    />
                    <h1
                      v-if="resDataListGroupFile.length > 0"
                      class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
                    >
                      Group Manager<span v-if="selectedGroupId != ''"
                        >:
                        {{
                          resDataListGroupFile.find(
                            (group) => group.id == selectedGroupId,
                          )?.name || "-"
                        }}</span
                      >
                    </h1>
                  </div>
                  <div>
                    <UButton
                      v-if="selectedGroupId != '' && loadedFile.length === 0"
                      @click="
                        resDataListGroupFile
                          .find((grp) => selectedGroupId === grp.id)
                          ?.files.map((f) => addLoadedFile(f))
                      "
                      type="button"
                      color="blue"
                      variant="solid"
                      icon="mingcute:chat-3-line"
                      :trailing="false"
                      label="Tambakan ke Chat"
                    />
                  </div>
                </div>
                <div v-if="resDataListGroupFile.length > 0" class="w-full">
                  <table class="table-fixed w-full">
                    <thead>
                      <tr v-if="selectedGroupId == ''">
                        <th>Nama Group</th>
                        <th class="text-end">Aksi</th>
                      </tr>
                      <tr v-else>
                        <th>Nama File</th>
                        <th class="text-end">Size</th>
                        <th class="text-end">Mime</th>
                        <th class="text-end">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-if="selectedGroupId == ''"
                        v-for="(group, index) in resDataListGroupFile"
                        :key="index"
                      >
                        <td>
                          <div
                            @click="selectedGroupId = group.id"
                            class="w-full flex justify-between items-center gap-4 cursor-pointer"
                          >
                            <div>
                              {{ group.name }}
                            </div>
                            <div>[ {{ group.files.length }} file ]</div>
                          </div>
                        </td>
                        <td class="text-end">
                          <div
                            class="w-full flex justify-end items-center gap-2.5"
                          >
                            <UButton
                              @click="
                                modalEditGroupId = group.id;
                                modalEditGroupInp = group.name;
                                toggleModalEditGroup();
                              "
                              type="button"
                              color="yellow"
                              variant="solid"
                              icon="mingcute:edit-fill"
                              :trailing="false"
                              label="Edit"
                            />
                            <UButton
                              @click="deleteGroup(group.id)"
                              type="button"
                              color="red"
                              variant="solid"
                              icon="mingcute:delete-fill"
                              :trailing="false"
                              label="Hapus"
                            />
                          </div>
                        </td>
                      </tr>
                      <tr
                        v-else-if="
                          resDataListFile.filter(
                            (file) => file.fileGroupId === selectedGroupId,
                          ).length > 0
                        "
                        v-for="(file, indexFile) in resDataListFile.filter(
                          (file) => file.fileGroupId === selectedGroupId,
                        )"
                        :key="indexFile"
                      >
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
                          <div
                            class="w-full flex justify-end items-center gap-2.5"
                          >
                            <UButton
                              @click="
                                modalEditFileId = file.id;
                                toggleModalEditFile();
                              "
                              type="button"
                              color="green"
                              variant="solid"
                              icon="mingcute:plus-fill"
                              :trailing="false"
                              label="Tambah ke Group"
                            />
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
                          </div>
                        </td>
                      </tr>
                      <tr v-else>
                        <td colspan="4">Tidak ada File</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="resDataListGroupFile.length > 0" class="py-12"></div>
                <h1
                  class="text-base font-semibold leading-6 text-gray-900 dark:text-white mb-4"
                >
                  File Manager
                </h1>
                <div class="w-full">
                  <table class="table-fixed w-full">
                    <thead>
                      <tr>
                        <th>Nama File</th>
                        <th class="text-end">Size</th>
                        <th class="text-end">Mime</th>
                        <th class="text-end">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(file, index) in resDataListFile.filter(
                          (file) => file.fileGroupId === null,
                        )"
                        :key="index"
                      >
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
                          <div
                            class="w-full flex justify-end items-center gap-2.5"
                          >
                            <UButton
                              @click="
                                modalEditFileId = file.id;
                                modalEditFileGroupName =
                                  resDataListGroupFile.find(
                                    (grp) => grp.id == file.fileGroupId,
                                  )?.name || '';
                                toggleModalEditFile();
                              "
                              type="button"
                              color="green"
                              variant="solid"
                              icon="mingcute:plus-fill"
                              :trailing="false"
                              label="Tambah ke Group"
                            />
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
                          </div>
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
          color="blue"
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
    <!-- BEGIN Add Group -->
    <UModal v-model="modalAddGroup">
      <UCard
        :ui="{
          ring: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
        }"
      >
        <template #header>
          <h1
            class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
          >
            Tambah Group
          </h1>
        </template>

        <form @submit.prevent="onSubmitAddGroup">
          <UInput
            v-model="modalAddGroupInp"
            placeholder="Nama Group"
            color="blue"
          />
        </form>

        <template #footer>
          <div class="w-full flex gap-4 justify-end items-center">
            <UButton
              @click="btnAddGroup()"
              type="button"
              color="blue"
              variant="solid"
              icon="mingcute:plus-fill"
              :trailing="false"
              label="Buat"
            />
          </div>
        </template>
      </UCard>
    </UModal>
    <!-- EOL Add Group -->
    <!-- BEGIN Edit Group -->
    <UModal v-model="modalEditGroup">
      <UCard
        :ui="{
          ring: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
        }"
      >
        <template #header>
          <h1
            class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
          >
            Edit Group
          </h1>
        </template>

        <form @submit.prevent="onSubmitEditGroup">
          <UInput
            v-model="modalEditGroupInp"
            placeholder="Nama Group"
            color="blue"
          />
        </form>
      </UCard>
    </UModal>
    <!-- EOL Edit Group -->
    <!-- BEGIN Edit File -->
    <UModal v-model="modalEditFile">
      <UCard
        :ui="{
          ring: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
        }"
      >
        <template #header>
          <h1
            class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
          >
            Pilih Group
          </h1>
        </template>

        <form @submit.prevent="onSubmitEditFile">
          <USelect
            v-model="modalEditFileGroupName"
            color="white"
            variant="outline"
            :options="resDataListGroupFile.map((group) => group.name)"
          />
        </form>

        <template #footer>
          <div class="w-full flex gap-4 justify-end items-center">
            <UButton
              @click="btnEditFile()"
              type="button"
              color="blue"
              variant="solid"
              icon="mingcute:plus-fill"
              :trailing="false"
              label="Tambahkan"
            />
          </div>
        </template>
      </UCard>
    </UModal>
    <!-- EOL Edit File -->
  </div>
</template>
<style module lang="postcss">
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
