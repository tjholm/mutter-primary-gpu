const currentExtension = imports.misc.extensionUtils.getCurrentExtension();
const { getActiveGpu, getGpus, getPrimaryGpu, getRenderer, setPrimaryGpu } = currentExtension.imports.primaryGpu;
const {Gio, GObject} = imports.gi;
const QuickSettings = imports.ui.quickSettings;
// This is the live instance of the Quick Settings menu
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const FeatureMenuToggle = GObject.registerClass(
class FeatureMenuToggle extends QuickSettings.QuickMenuToggle {
    _init() {
        super._init({
            label: 'GPU',
            iconName: 'video-display-symbolic',
            toggleMode: false,
        });
        
        this.menu.setHeader('video-display-symbolic', 'Primary GPU');
        this.menu.connect("open-state-changed", (_, open) => {
            if (open) this._sync();
        });

        this._sync();
    }

    async _sync() {
        const gpus = getGpus();
        const primary = getPrimaryGpu();
        const active = await getActiveGpu();

        this.label = active;

        if (primary) gpus.add(primary);
        const proms = [...gpus].map(async (gpu) => {
          const label = await getRenderer(gpu);

          let ornament = PopupMenu.Ornament.NONE
          if (label === active) {
            ornament = PopupMenu.Ornament.CHECK
            if (gpu === primary) {
              this.checked = true;
            }
          } else if (gpu === primary) {
            ornament = PopupMenu.Ornament.DOT
          }

          const item = new PopupMenu.PopupMenuItem(label ?? `/dev/dri/${gpu}`);
          item.setOrnament(ornament);
          item.connect("activate", () => {
            setPrimaryGpu(gpu === primary ? null : gpu);
            this.label = label;
          });
          return item;
        });
  
        Promise.all(proms)
          .then((items) => {
            this.menu.removeAll();
            for (const item of items) this.menu.addMenuItem(item);
          })
          .catch(logError);
      }
});

var PrimaryGpuQuickSettings = class PrimaryGpuQuickSettings {
    constructor() {
        this._toggle = null;
    }
    
    enable() {
        this._toggle = new FeatureMenuToggle();
        QuickSettingsMenu._addItems([this._toggle]);
    }
    
    disable() {
        this._toggle.destroy();
        this._toggle = null;
    }
}