import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Provider } from "jotai";
import type { TaskView } from "@/app/atoms/ui-atoms";
import TasksToolbar from "./TasksToolbar";

function renderToolbar(view: TaskView = "now") {
  const handlers = {
    onViewChange: vi.fn(),
    onGroupByChange: vi.fn(),
    onSortChange: vi.fn(),
    onSearchQueryChange: vi.fn(),
    onTagAdd: vi.fn(),
    onTagRemove: vi.fn(),
  };
  render(
    <Provider>
      <TasksToolbar
        view={view}
        counts={{ board: 9, now: 2, today: 1, upcoming: 4, all: 9 }}
        groupBy="status"
        sort="dueDate:asc"
        searchQuery=""
        tagFilter={[]}
        allTags={["infra"]}
        {...handlers}
      />
    </Provider>,
  );
  return handlers;
}

describe("TasksToolbar", () => {
  afterEach(cleanup);

  it("switches lists from the segmented control, with each list's count", () => {
    const { onViewChange } = renderToolbar("now");
    expect(screen.getByRole("tab", { name: /^Now/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: /^Upcoming/ }));
    expect(onViewChange).toHaveBeenCalledWith("upcoming");
  });

  it("offers grouping and sort only in All", () => {
    renderToolbar("today");
    expect(screen.queryByRole("button", { name: "Group and sort" })).toBeNull();
  });

  it("groups and sorts from the All menu", () => {
    const { onGroupByChange, onSortChange } = renderToolbar("all");

    fireEvent.click(screen.getByRole("button", { name: "Group and sort" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Group by Status" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Group by Note" }));
    expect(onGroupByChange).toHaveBeenCalledWith("file");

    fireEvent.click(screen.getByRole("button", { name: "Group and sort" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Sort by Priority" }));
    expect(onSortChange).toHaveBeenCalledWith("priority:desc");

    fireEvent.click(screen.getByRole("button", { name: "Group and sort" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Descending" }));
    expect(onSortChange).toHaveBeenLastCalledWith("dueDate:desc");
  });

  it("filters by text from the search field", () => {
    const { onSearchQueryChange } = renderToolbar();
    fireEvent.change(screen.getByRole("textbox", { name: "Filter tasks" }), { target: { value: "deploy" } });
    expect(onSearchQueryChange).toHaveBeenCalledWith("deploy");
  });
});
