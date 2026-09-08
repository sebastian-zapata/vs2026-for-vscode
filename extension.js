/*
 * VS2026 for VS Code
 *
 * Copyright (c) 2026 Sebastian Zapata
 * SPDX-License-Identifier: MIT
 */

const vscode = require("vscode");

const LOADER_EXTENSION_ID = "be5invis.vscode-custom-css";
const LOADER_UPDATE_COMMAND = "extension.updateCustomCSS";
const IMPORTS_SECTION = "vscode_custom_css";
const IMPORTS_PROPERTY = "imports";
const APPLIED_STATE_KEY = "appliedState";
const MANAGED_IMPORTS_KEY = "managedImports";
const FONT_FILE_NAME = "SebastianZapataConsole.ttf";
const FONT_STYLE_FILE_NAME = "vs2026-font.css";

const LEGACY_IMPORTS = new Set([
  "file://${userHome}/.config/Code/User/custom.css",
  "file://${userHome}/.config/Code/User/custom.js"
]);

async function createFontImport(context) {
  const fontUri = vscode.Uri.joinPath(
    context.extensionUri,
    "fonts",
    "SebastianZapataConsole",
    FONT_FILE_NAME
  );
  const fontData = await vscode.workspace.fs.readFile(fontUri);
  const encodedFont = Buffer.from(fontData).toString("base64");
  const fontStyle = [
    "@font-face {",
    '  font-family: "Sebastian Zapata Console";',
    `  src: url("data:font/ttf;base64,${encodedFont}") ` +
      'format("truetype");',
    "  font-style: normal;",
    "  font-weight: normal;",
    "  font-display: swap;",
    "}",
    ""
  ].join("\n");

  await vscode.workspace.fs.createDirectory(
    context.globalStorageUri
  );

  const fontStyleUri = vscode.Uri.joinPath(
    context.globalStorageUri,
    FONT_STYLE_FILE_NAME
  );

  await vscode.workspace.fs.writeFile(
    fontStyleUri,
    Buffer.from(fontStyle, "utf8")
  );

  return fontStyleUri.toString();
}

async function getBundledImports(context) {
  const fontImport = await createFontImport(context);

  return [
    fontImport,
    vscode.Uri.joinPath(
      context.extensionUri,
      "custom.css"
    ).toString(),
    vscode.Uri.joinPath(
      context.extensionUri,
      "custom.js"
    ).toString()
  ];
}

function hasWorkspaceOverride(inspection) {
  return inspection.workspaceValue !== undefined ||
    inspection.workspaceFolderValue !== undefined ||
    inspection.workspaceLanguageValue !== undefined ||
    inspection.workspaceFolderLanguageValue !== undefined;
}

function getGlobalImports(inspection) {
  if (!Array.isArray(inspection.globalValue)) {
    return [];
  }

  return inspection.globalValue;
}

function getManagedImports(context) {
  const value = context.globalState.get(MANAGED_IMPORTS_KEY);

  return Array.isArray(value) ? value : [];
}

function mergeImports(currentImports, oldManagedImports, bundledImports) {
  const managedImports = new Set([
    ...LEGACY_IMPORTS,
    ...oldManagedImports,
    ...bundledImports
  ]);

  const mergedImports = currentImports.filter((uri) => {
    return !managedImports.has(uri);
  });

  mergedImports.push(...bundledImports);

  return mergedImports;
}

function arraysEqual(left, right) {
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

async function updateImports(context, bundledImports) {
  const configuration =
    vscode.workspace.getConfiguration(IMPORTS_SECTION);
  const inspection = configuration.inspect(IMPORTS_PROPERTY);

  if (!inspection) {
    throw new Error(
      "The vscode_custom_css.imports setting is unavailable."
    );
  }

  if (hasWorkspaceOverride(inspection)) {
    throw new Error(
      "A workspace-level vscode_custom_css.imports setting overrides " +
        "the user setting."
    );
  }

  const currentImports = getGlobalImports(inspection);
  const oldManagedImports = getManagedImports(context);
  const mergedImports = mergeImports(
    currentImports,
    oldManagedImports,
    bundledImports
  );

  const changed = !arraysEqual(currentImports, mergedImports);

  if (changed) {
    await configuration.update(
      IMPORTS_PROPERTY,
      mergedImports,
      vscode.ConfigurationTarget.Global
    );
  }

  await context.globalState.update(
    MANAGED_IMPORTS_KEY,
    bundledImports
  );

  return {
    changed,
    imports: mergedImports
  };
}

function getCurrentState(context, loaderExtension, imports) {
  return {
    extensionVersion: context.extension.packageJSON.version,
    loaderVersion: loaderExtension.packageJSON.version,
    vscodeVersion: vscode.version,
    imports
  };
}

function statesEqual(left, right) {
  return Boolean(left) &&
    left.extensionVersion === right.extensionVersion &&
    left.loaderVersion === right.loaderVersion &&
    left.vscodeVersion === right.vscodeVersion &&
    arraysEqual(left.imports || [], right.imports);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function applyCustomizations(context) {
  try {
    const loaderExtension =
      vscode.extensions.getExtension(LOADER_EXTENSION_ID);

    if (!loaderExtension) {
      throw new Error(
        `Required extension ${LOADER_EXTENSION_ID} is not installed.`
      );
    }

    await loaderExtension.activate();

    const bundledImports = await getBundledImports(context);
    const importUpdate = await updateImports(
      context,
      bundledImports
    );

    const currentState = getCurrentState(
      context,
      loaderExtension,
      importUpdate.imports
    );
    const previousState =
      context.globalState.get(APPLIED_STATE_KEY);

    if (
      !importUpdate.changed &&
      statesEqual(previousState, currentState)
    ) {
      return;
    }

    await vscode.commands.executeCommand(LOADER_UPDATE_COMMAND);
    await context.globalState.update(
      APPLIED_STATE_KEY,
      currentState
    );
  } catch (error) {
    const message = getErrorMessage(error);

    await vscode.window.showErrorMessage(
      `VS2026 for VS Code could not be applied: ${message}`
    );
  }
}

async function activate(context) {
  await applyCustomizations(context);
}

exports.activate = activate;
