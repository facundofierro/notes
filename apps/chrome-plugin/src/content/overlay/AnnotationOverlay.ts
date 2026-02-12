import { Annotation, AnnotationType, ANNOTATION_COLORS, computeArrowheadPoints } from "@agelum/annotation";

export class AnnotationOverlay {
  private root: HTMLDivElement;
  private container: HTMLDivElement;
  private image: HTMLImageElement;
  private svg: SVGSVGElement;
  private toolbar: HTMLDivElement;
  
  private annotations: Annotation[] = [];
  private selectedTool: AnnotationType = "modify";
  private isDrawing = false;
  private startPos = { x: 0, y: 0 };
  private currentPos = { x: 0, y: 0 };
  
  private onComplete: (annotations: Annotation[], width: number, height: number) => void;
  private onDismiss: () => void;

  constructor(
    screenshotDataUrl: string,
    onComplete: (annotations: Annotation[], width: number, height: number) => void,
    onDismiss: () => void
  ) {
    this.onComplete = onComplete;
    this.onDismiss = onDismiss;

    // Create root element
    this.root = document.createElement("div");
    this.root.id = "agelum-overlay-root";
    
    // Create toolbar
    this.toolbar = this.createToolbar();
    this.root.appendChild(this.toolbar);

    // Create container
    this.container = document.createElement("div");
    this.container.id = "agelum-overlay-container";
    this.root.appendChild(this.container);

    // Create image
    this.image = document.createElement("img");
    this.image.id = "agelum-screenshot";
    this.image.src = screenshotDataUrl;
    this.image.draggable = false;
    this.container.appendChild(this.image);

    // Create SVG overlay
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.id = "agelum-svg-overlay";
    this.container.appendChild(this.svg);

    // Event listeners
    this.container.addEventListener("mousedown", this.handleMouseDown.bind(this));
    window.addEventListener("mousemove", this.handleMouseMove.bind(this));
    window.addEventListener("mouseup", this.handleMouseUp.bind(this));
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    
    document.body.appendChild(this.root);
    
    // Initial render
    this.render();
  }

  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement("div");
    toolbar.id = "agelum-toolbar";

    const tools: { type: AnnotationType; label: string }[] = [
      { type: "modify", label: "Modify" },
      { type: "arrow", label: "Arrow" },
      { type: "remove", label: "Remove" },
    ];

    tools.forEach((tool) => {
      const btn = document.createElement("button");
      btn.className = `agelum-btn ${this.selectedTool === tool.type ? "active" : ""}`;
      btn.textContent = tool.label;
      btn.onclick = () => {
        this.selectedTool = tool.type;
        this.updateToolbar();
      };
      toolbar.appendChild(btn);
    });

    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    toolbar.appendChild(spacer);

    const doneBtn = document.createElement("button");
    doneBtn.className = "agelum-btn agelum-btn-done";
    doneBtn.textContent = "Done";
    doneBtn.onclick = () => {
      this.onComplete(this.annotations, this.image.clientWidth, this.image.clientHeight);
      this.destroy();
    };
    toolbar.appendChild(doneBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "agelum-btn agelum-btn-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
      this.onDismiss();
      this.destroy();
    };
    toolbar.appendChild(cancelBtn);

    return toolbar;
  }

  private updateToolbar() {
    const buttons = this.toolbar.querySelectorAll(".agelum-btn");
    buttons.forEach((btn) => {
      if (btn.textContent === "Modify") btn.className = `agelum-btn ${this.selectedTool === "modify" ? "active" : ""}`;
      if (btn.textContent === "Arrow") btn.className = `agelum-btn ${this.selectedTool === "arrow" ? "active" : ""}`;
      if (btn.textContent === "Remove") btn.className = `agelum-btn ${this.selectedTool === "remove" ? "active" : ""}`;
    });
  }

  private handleMouseDown(e: MouseEvent) {
    const rect = this.image.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    this.isDrawing = true;
    this.startPos = { x, y };
    this.currentPos = { x, y };
    this.render();
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDrawing) return;
    const rect = this.image.getBoundingClientRect();
    this.currentPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    this.render();
  }

  private handleMouseUp(e: MouseEvent) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const rect = this.image.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (this.selectedTool === "arrow") {
      const distance = Math.sqrt(
        Math.pow(currentX - this.startPos.x, 2) + Math.pow(currentY - this.startPos.y, 2)
      );
      if (distance > 10) {
        this.addAnnotation({
          id: this.annotations.length + 1,
          type: "arrow",
          x: this.startPos.x,
          y: this.startPos.y,
          endX: currentX,
          endY: currentY,
          prompt: "",
        });
      }
    } else {
      const width = Math.abs(currentX - this.startPos.x);
      const height = Math.abs(currentY - this.startPos.y);
      const x = Math.min(this.startPos.x, currentX);
      const y = Math.min(this.startPos.y, currentY);

      if (width > 5 && height > 5) {
        this.addAnnotation({
          id: this.annotations.length + 1,
          type: this.selectedTool,
          x,
          y,
          width,
          height,
          prompt: "",
        });
      }
    }
    this.render();
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.onDismiss();
      this.destroy();
    }
  }

  private addAnnotation(ann: Annotation) {
    this.annotations.push(ann);
  }

  private render() {
    // Clear SVG
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    // Render existing annotations
    this.annotations.forEach((ann) => {
      if (ann.type === "arrow" && ann.endX !== undefined && ann.endY !== undefined) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", ann.x.toString());
        line.setAttribute("y1", ann.y.toString());
        line.setAttribute("x2", ann.endX.toString());
        line.setAttribute("y2", ann.endY.toString());
        line.setAttribute("stroke", ANNOTATION_COLORS.arrow.stroke);
        line.setAttribute("stroke-width", "3");
        this.svg.appendChild(line);

        const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        arrowHead.setAttribute("points", computeArrowheadPoints(ann.x, ann.y, ann.endX, ann.endY));
        arrowHead.setAttribute("fill", ANNOTATION_COLORS.arrow.stroke);
        this.svg.appendChild(arrowHead);
      } else if (ann.type === "modify" || ann.type === "remove") {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", ann.x.toString());
        rect.setAttribute("y", ann.y.toString());
        rect.setAttribute("width", (ann.width || 0).toString());
        rect.setAttribute("height", (ann.height || 0).toString());
        rect.setAttribute("stroke", ANNOTATION_COLORS[ann.type].stroke);
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("fill", ANNOTATION_COLORS[ann.type].fill);
        this.svg.appendChild(rect);
      }

      // Add badge
      this.renderBadge(ann);
      
      if (ann.type === "remove") {
        this.renderRemoveLabel(ann);
      }
    });

    // Render live preview
    if (this.isDrawing) {
      if (this.selectedTool === "arrow") {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", this.startPos.x.toString());
        line.setAttribute("y1", this.startPos.y.toString());
        line.setAttribute("x2", this.currentPos.x.toString());
        line.setAttribute("y2", this.currentPos.y.toString());
        line.setAttribute("stroke", ANNOTATION_COLORS.arrow.stroke);
        line.setAttribute("stroke-width", "3");
        line.setAttribute("stroke-dasharray", "5,5");
        this.svg.appendChild(line);

        const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        arrowHead.setAttribute("points", computeArrowheadPoints(this.startPos.x, this.startPos.y, this.currentPos.x, this.currentPos.y));
        arrowHead.setAttribute("fill", ANNOTATION_COLORS.arrow.stroke);
        arrowHead.setAttribute("opacity", "0.7");
        this.svg.appendChild(arrowHead);
      } else {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const x = Math.min(this.startPos.x, this.currentPos.x);
        const y = Math.min(this.startPos.y, this.currentPos.y);
        const width = Math.abs(this.currentPos.x - this.startPos.x);
        const height = Math.abs(this.currentPos.y - this.startPos.y);
        rect.setAttribute("x", x.toString());
        rect.setAttribute("y", y.toString());
        rect.setAttribute("width", width.toString());
        rect.setAttribute("height", height.toString());
        rect.setAttribute("stroke", ANNOTATION_COLORS[this.selectedTool].stroke);
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("fill", ANNOTATION_COLORS[this.selectedTool].fill);
        rect.setAttribute("stroke-dasharray", "5,5");
        this.svg.appendChild(rect);
      }
    }
  }

  private renderBadge(ann: Annotation) {
    const badge = document.createElement("div");
    badge.className = "agelum-badge";
    badge.style.position = "absolute";
    badge.style.width = "24px";
    badge.style.height = "24px";
    badge.style.borderRadius = "50%";
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.justifyContent = "center";
    badge.style.fontSize = "10px";
    badge.style.border = "2px solid white";
    badge.style.color = "white";
    badge.style.fontWeight = "bold";
    badge.style.left = `${ann.x}px`;
    badge.style.top = `${ann.y}px`;
    badge.style.transform = "translate(-50%, -50%)";
    
    const colors = {
      modify: "#f59e0b",
      remove: "#dc2626",
      arrow: "#3b82f6",
    };
    badge.style.backgroundColor = colors[ann.type];
    badge.textContent = ann.id.toString();
    
    this.container.appendChild(badge);
  }

  private renderRemoveLabel(ann: Annotation) {
    const label = document.createElement("div");
    label.textContent = "REMOVE THIS";
    label.style.position = "absolute";
    label.style.backgroundColor = "#dc2626";
    label.style.color = "white";
    label.style.fontSize = "9px";
    label.style.padding = "2px 6px";
    label.style.borderRadius = "2px";
    label.style.whiteSpace = "nowrap";
    label.style.fontWeight = "500";
    label.style.left = `${ann.x + 12}px`;
    label.style.top = `${ann.y - 25}px`;
    this.container.appendChild(label);
  }

  public destroy() {
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("keydown", this.handleKeyDown);
    if (this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }

  public setTool(tool: AnnotationType) {
    this.selectedTool = tool;
    this.updateToolbar();
  }
}
